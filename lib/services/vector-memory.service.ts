import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";

interface EmbeddingResult {
  id: string;
  content: string;
  contentType: string;
  similarity: number;
  metadata: any;
}

export const vectorMemoryService = {
  async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = getConfig("AI_API_KEY") || "";
    const baseURL = getConfig("AI_BASE_URL") || "";
    const model = getConfig("AI_EMBEDDING_MODEL") || "text-embedding-3-small";

    const response = await fetch(`${baseURL}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: text }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  },

  async storeEmbedding(
    projectId: string,
    content: string,
    contentType: string,
    chapterId?: string,
    metadata?: any
  ): Promise<void> {
    const embedding = await this.generateEmbedding(content);
    const vectorStr = `[${embedding.join(",")}]`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "MemoryEmbedding" (id, "projectId", "chapterId", "contentType", content, embedding, metadata, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::vector, $6::jsonb, NOW())`,
      projectId,
      chapterId || null,
      contentType,
      content,
      vectorStr,
      JSON.stringify(metadata || {})
    );
  },

  async storeChapterEmbeddings(
    projectId: string,
    chapterId: string,
    chapterSummary: string,
    scenes: Array<{ sceneNumber: number; content: string }>,
    characterChanges: Array<{ characterName: string; change: string }>
  ): Promise<void> {
    await this.storeEmbedding(
      projectId,
      chapterSummary,
      "chapter_summary",
      chapterId
    );

    for (const scene of scenes) {
      await this.storeEmbedding(
        projectId,
        scene.content,
        "scene",
        chapterId,
        { sceneNumber: scene.sceneNumber }
      );
    }

    for (const change of characterChanges) {
      await this.storeEmbedding(
        projectId,
        `${change.characterName}: ${change.change}`,
        "character_state",
        chapterId
      );
    }
  },

  async semanticSearch(
    projectId: string,
    query: string,
    contentType?: string,
    limit: number = 10
  ): Promise<EmbeddingResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const vectorStr = `[${queryEmbedding.join(",")}]`;

    // pgvector native cosine distance query
    const results: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, content, "contentType", metadata,
              1 - (embedding <=> $1::vector) as similarity
       FROM "MemoryEmbedding"
       WHERE "projectId" = $2
       ${contentType ? `AND "contentType" = $3` : ""}
       ORDER BY embedding <=> $1::vector
       LIMIT ${limit}`,
      vectorStr,
      projectId,
      ...(contentType ? [contentType] : [])
    );

    return results.map((r: any) => ({
      id: r.id,
      content: r.content,
      contentType: r.contentType,
      similarity: parseFloat(r.similarity),
      metadata: r.metadata,
    }));
  },

  async recallRelevantContext(
    projectId: string,
    chapterGoal: string,
    sceneCards: any[]
  ): Promise<string[]> {
    const query = [
      chapterGoal,
      ...sceneCards.map(
        (s: any) => `${s.location} ${s.conflict} ${s.infoChange}`
      ),
    ].join(" ");

    const results = await this.semanticSearch(projectId, query, undefined, 5);

    return results.filter((r) => r.similarity > 0.7).map((r) => r.content);
  },
};
