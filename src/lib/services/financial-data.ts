import { createServerSupabaseClient } from "../supabase";

export interface FinancialDataPoint {
    metric_name: string;
    metric_value: number;
    unit: string;
    year: string;
    period: string;
    document_id: string;
    documents: {
        id: string;
        name: string;
    };
}

export async function queryFinancialData(
    metricNames: string[],
    year?: string,
    period?: string,
    documentIds?: string[]
): Promise<FinancialDataPoint[]> {
    const supabase = createServerSupabaseClient();

    let query = supabase
        .from("financial_data")
        .select(`
      metric_name,
      metric_value,
      unit,
      year,
      period,
      document_id,
      documents!inner(id, name)
    `)
        .in("metric_name", metricNames);

    if (year) {
        query = query.eq("year", year);
    }

    if (period) {
        query = query.eq("period", period);
    }

    if (documentIds && documentIds.length > 0) {
        query = query.in("document_id", documentIds);
    }

    query = query.order("year", { ascending: false });
    query = query.order("period", { ascending: false });

    const { data, error } = await query;

    if (error) {
        console.error("Error querying financial data:", error);
        throw new Error("查询财务数据失败");
    }

    return (data || []) as FinancialDataPoint[];
}
