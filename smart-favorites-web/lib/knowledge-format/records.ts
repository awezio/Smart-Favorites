import { createAdminClient } from "@/lib/supabase/admin";

export const KNOWLEDGE_PAGE_SIZE = 1000;

export async function fetchAllKnowledgeRows<T>(
  supabase: ReturnType<typeof createAdminClient>,
  table: string,
  userId: string,
  orderBy: Array<{ column: string; ascending?: boolean }>
): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from(table)
      .select("*")
      .eq("user_id", userId);

    for (const order of orderBy) {
      query = query.order(order.column, { ascending: order.ascending ?? true });
    }

    const { data, error } = await query.range(offset, offset + KNOWLEDGE_PAGE_SIZE - 1);
    if (error) {
      throw new Error(error.message);
    }

    if (!data?.length) {
      break;
    }

    rows.push(...(data as T[]));
    if (data.length < KNOWLEDGE_PAGE_SIZE) {
      break;
    }

    offset += KNOWLEDGE_PAGE_SIZE;
  }

  return rows;
}
