import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

// Define a wrapper schema to handle multiple years/periods
// OpenAI Structured Outputs requires strict schemas. z.record is not supported.
// We must define a union of possible schemas or a single comprehensive schema.
// Since we want to support Balance Sheet, Income Statement, and Cash Flow, 
// and OpenAI requires all fields to be specified if we want strict mode,
// we will define a "Super Schema" that contains all possible fields as optional.

const FinancialContentSchema = z.object({
    // Balance Sheet Fields
    "货币资金": z.number().nullable().optional(),
    "结算备付金": z.number().nullable().optional(),
    "拆出资金": z.number().nullable().optional(),
    "交易性金融资产": z.number().nullable().optional(),
    "衍生金融资产": z.number().nullable().optional(),
    "应收票据": z.number().nullable().optional(),
    "应收账款": z.number().nullable().optional(),
    "应收款项融资": z.number().nullable().optional(),
    "预付款项": z.number().nullable().optional(),
    "应收保费": z.number().nullable().optional(),
    "应收分保账款": z.number().nullable().optional(),
    "应收分保合同准备金": z.number().nullable().optional(),
    "其他应收款": z.number().nullable().optional(),
    "买入返售金融资产": z.number().nullable().optional(),
    "存货": z.number().nullable().optional(),
    "合同资产": z.number().nullable().optional(),
    "持有待售资产": z.number().nullable().optional(),
    "一年内到期的非流动资产": z.number().nullable().optional(),
    "其他流动资产": z.number().nullable().optional(),
    "流动资产合计": z.number().nullable().optional(),
    "发放贷款和垫款": z.number().nullable().optional(),
    "债权投资": z.number().nullable().optional(),
    "其他债权投资": z.number().nullable().optional(),
    "长期应收款": z.number().nullable().optional(),
    "长期股权投资": z.number().nullable().optional(),
    "其他权益工具投资": z.number().nullable().optional(),
    "其他非流动金融资产": z.number().nullable().optional(),
    "投资性房地产": z.number().nullable().optional(),
    "固定资产": z.number().nullable().optional(),
    "在建工程": z.number().nullable().optional(),
    "生产性生物资产": z.number().nullable().optional(),
    "油气资产": z.number().nullable().optional(),
    "使用权资产": z.number().nullable().optional(),
    "无形资产": z.number().nullable().optional(),
    "开发支出": z.number().nullable().optional(),
    "商誉": z.number().nullable().optional(),
    "长期待摊费用": z.number().nullable().optional(),
    "递延所得税资产": z.number().nullable().optional(),
    "其他非流动资产": z.number().nullable().optional(),
    "非流动资产合计": z.number().nullable().optional(),
    "资产总计": z.number().nullable().optional(),
    "短期借款": z.number().nullable().optional(),
    "向中央银行借款": z.number().nullable().optional(),
    "拆入资金": z.number().nullable().optional(),
    "交易性金融负债": z.number().nullable().optional(),
    "衍生金融负债": z.number().nullable().optional(),
    "应付票据": z.number().nullable().optional(),
    "应付账款": z.number().nullable().optional(),
    "预收款项": z.number().nullable().optional(),
    "合同负债": z.number().nullable().optional(),
    "卖出回购金融资产款": z.number().nullable().optional(),
    "吸收存款及同业存放": z.number().nullable().optional(),
    "代理买卖证券款": z.number().nullable().optional(),
    "代理承销证券款": z.number().nullable().optional(),
    "应付职工薪酬": z.number().nullable().optional(),
    "应交税费": z.number().nullable().optional(),
    "其他应付款": z.number().nullable().optional(),
    "应付手续费及佣金": z.number().nullable().optional(),
    "应付分保账款": z.number().nullable().optional(),
    "持有待售负债": z.number().nullable().optional(),
    "一年内到期的非流动负债": z.number().nullable().optional(),
    "其他流动负债": z.number().nullable().optional(),
    "流动负债合计": z.number().nullable().optional(),
    "保险合同准备金": z.number().nullable().optional(),
    "长期借款": z.number().nullable().optional(),
    "应付债券": z.number().nullable().optional(),
    "租赁负债": z.number().nullable().optional(),
    "长期应付款": z.number().nullable().optional(),
    "长期应付职工薪酬": z.number().nullable().optional(),
    "预计负债": z.number().nullable().optional(),
    "递延收益": z.number().nullable().optional(),
    "递延所得税负债": z.number().nullable().optional(),
    "其他非流动负债": z.number().nullable().optional(),
    "非流动负债合计": z.number().nullable().optional(),
    "负债总计": z.number().nullable().optional(),
    "股本": z.number().nullable().optional(),
    "其他权益工具": z.number().nullable().optional(),
    "资本公积": z.number().nullable().optional(),
    "减：库存股": z.number().nullable().optional(),
    "其他综合收益": z.number().nullable().optional(),
    "专项储备": z.number().nullable().optional(),
    "盈余公积": z.number().nullable().optional(),
    "一般风险准备": z.number().nullable().optional(),
    "未分配利润": z.number().nullable().optional(),
    "归属于母公司所有者权益合计": z.number().nullable().optional(),
    "少数股东权益": z.number().nullable().optional(),
    "所有者权益合计": z.number().nullable().optional(),
    "负债和所有者权益总计": z.number().nullable().optional(),

    // Income Statement Fields
    "一、营业总收入": z.number().nullable().optional(),
    "其中：营业收入": z.number().nullable().optional(),
    "利息收入": z.number().nullable().optional(),
    "已赚保费": z.number().nullable().optional(),
    "手续费及佣金收入": z.number().nullable().optional(),
    "二、营业总成本": z.number().nullable().optional(),
    "其中：营业成本": z.number().nullable().optional(),
    "利息支出": z.number().nullable().optional(),
    "手续费及佣金支出": z.number().nullable().optional(),
    "退保金": z.number().nullable().optional(),
    "赔付支出净额": z.number().nullable().optional(),
    "提取保险责任准备金净额": z.number().nullable().optional(),
    "保单红利支出": z.number().nullable().optional(),
    "分保费用": z.number().nullable().optional(),
    "税金及附加": z.number().nullable().optional(),
    "销售费用": z.number().nullable().optional(),
    "管理费用": z.number().nullable().optional(),
    "研发费用": z.number().nullable().optional(),
    "财务费用": z.number().nullable().optional(),
    "加：其他收益": z.number().nullable().optional(),
    "投资收益": z.number().nullable().optional(),
    "汇兑收益": z.number().nullable().optional(),
    "净敞口套期收益": z.number().nullable().optional(),
    "公允价值变动收益": z.number().nullable().optional(),
    "信用减值损失": z.number().nullable().optional(),
    "资产减值损失": z.number().nullable().optional(),
    "资产处置收益": z.number().nullable().optional(),
    "三、营业利润": z.number().nullable().optional(),
    "加：营业外收入": z.number().nullable().optional(),
    "减：营业外支出": z.number().nullable().optional(),
    "四、利润总额": z.number().nullable().optional(),
    "减：所得税费用": z.number().nullable().optional(),
    "五、净利润": z.number().nullable().optional(),
    "归属于母公司股东的净利润": z.number().nullable().optional(),
    "少数股东损益": z.number().nullable().optional(),
    "六、其他综合收益的税后净额": z.number().nullable().optional(),
    "归属于母公司所有者的其他综合收益的税后净额": z.number().nullable().optional(),
    "归属于少数股东的其他综合收益的税后净额": z.number().nullable().optional(),
    "七、综合收益总额": z.number().nullable().optional(),
    "归属于母公司所有者的综合收益总额": z.number().nullable().optional(),
    "归属于少数股东的综合收益总额": z.number().nullable().optional(),
    "基本每股收益": z.number().nullable().optional(),
    "稀释每股收益": z.number().nullable().optional(),

    // Cash Flow Fields
    "销售商品、提供劳务收到的现金": z.number().nullable().optional(),
    "客户存款和同业存放款项净增加额": z.number().nullable().optional(),
    "向中央银行借款净增加额": z.number().nullable().optional(),
    "向其他金融机构拆入资金净增加额": z.number().nullable().optional(),
    "收到原保险合同保费取得的现金": z.number().nullable().optional(),
    "收到再保业务现金净额": z.number().nullable().optional(),
    "保户储金及投资款净增加额": z.number().nullable().optional(),
    "收取利息、手续费及佣金的现金": z.number().nullable().optional(),
    "拆入资金净增加额": z.number().nullable().optional(),
    "回购业务资金净增加额": z.number().nullable().optional(),
    "代理买卖证券收到的现金净额": z.number().nullable().optional(),
    "收到的税费返还": z.number().nullable().optional(),
    "收到其他与经营活动有关的现金": z.number().nullable().optional(),
    "经营活动现金流入小计": z.number().nullable().optional(),
    "购买商品、接受劳务支付的现金": z.number().nullable().optional(),
    "客户贷款及垫款净增加额": z.number().nullable().optional(),
    "存放中央银行和同业款项净增加额": z.number().nullable().optional(),
    "支付原保险合同赔付款项的现金": z.number().nullable().optional(),
    "拆出资金净增加额": z.number().nullable().optional(),
    "支付利息、手续费及佣金的现金": z.number().nullable().optional(),
    "支付保单红利的现金": z.number().nullable().optional(),
    "支付给职工以及为职工支付的现金": z.number().nullable().optional(),
    "支付的各项税费": z.number().nullable().optional(),
    "支付其他与经营活动有关的现金": z.number().nullable().optional(),
    "经营活动现金流出小计": z.number().nullable().optional(),
    "经营活动产生的现金流量净额": z.number().nullable().optional(),
    "收回投资收到的现金": z.number().nullable().optional(),
    "取得投资收益收到的现金": z.number().nullable().optional(),
    "处置固定资产、无形资产和其他长期资产收回的现金净额": z.number().nullable().optional(),
    "处置子公司及其他营业单位收到的现金净额": z.number().nullable().optional(),
    "收到其他与投资活动有关的现金": z.number().nullable().optional(),
    "投资活动现金流入小计": z.number().nullable().optional(),
    "购建固定资产、无形资产和其他长期资产支付的现金": z.number().nullable().optional(),
    "投资支付的现金": z.number().nullable().optional(),
    "质押贷款净增加额": z.number().nullable().optional(),
    "取得子公司及其他营业单位支付的现金净额": z.number().nullable().optional(),
    "支付其他与投资活动有关的现金": z.number().nullable().optional(),
    "投资活动现金流出小计": z.number().nullable().optional(),
    "投资活动产生的现金流量净额": z.number().nullable().optional(),
    "吸收投资收到的现金": z.number().nullable().optional(),
    "取得借款收到的现金": z.number().nullable().optional(),
    "收到其他与筹资活动有关的现金": z.number().nullable().optional(),
    "筹资活动现金流入小计": z.number().nullable().optional(),
    "偿还债务支付的现金": z.number().nullable().optional(),
    "分配股利、利润或偿付利息支付的现金": z.number().nullable().optional(),
    "支付其他与筹资活动有关的现金": z.number().nullable().optional(),
    "筹资活动现金流出小计": z.number().nullable().optional(),
    "筹资活动产生的现金流量净额": z.number().nullable().optional(),
    "四、汇率变动对现金及现金等价物的影响": z.number().nullable().optional(),
    "五、现金及现金等价物净增加额": z.number().nullable().optional(),
    "加：期初现金及现金等价物余额": z.number().nullable().optional(),
    "六、期末现金及现金等价物余额": z.number().nullable().optional(),
});

const ExtractionResponseSchema = z.object({
    documentType: z.enum(['balance_sheet', 'income_statement', 'cash_flow']),
    data: z.array(z.object({
        year: z.string().describe("Year of the data (e.g., '2021')"),
        period: z.string().describe("Period of the data (e.g., 'annual', 'Q1')"),
        content: FinancialContentSchema
    }))
});

export async function performAIExtraction(
    text: string,
    fileName: string,
    openai: OpenAI
): Promise<{
    type: 'balance_sheet' | 'income_statement' | 'cash_flow';
    data: Array<{ year: string; period: string; content: Record<string, number | null | undefined> }>;
}> {
    console.log(`[AI Extraction] Starting extraction for ${fileName}...`);

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-2024-08-06",
            messages: [
                {
                    role: "system",
                    content: `You are an expert accountant and financial data analyst. 
Your task is to extract financial data from the provided text (converted from an Excel file) and map it to a standard schema.

### CRITICAL INSTRUCTIONS:
1. **DO NOT CONVERT SIGNS**: Assume the input is a standard public financial statement. Do not flip signs for liabilities or equity unless they are explicitly negative in the source text. Keep the values exactly as they appear in the source.
2. **Standard Schema**: Map the source columns/rows to the standard Chinese field names provided in the schema definition. The keys in the JSON output MUST be in Chinese, matching the standard Chinese financial terms (e.g., "货币资金", "营业收入").
3. **Multiple Periods**: If the document contains data for multiple years (e.g., 2021 and 2020), extract ALL of them as separate entries.
4. **Missing Values**: If a specific field is not present in the source, set it to null or 0.
5. **Data Integrity**: Ensure that if the source has "Net Value" (净值), you use it. If it only has "Original Value" (原值) and "Provision" (准备), try to find the Net Value line. If not found, do not calculate it yourself unless explicitly obvious.

### Schema Definitions (Examples):
- **Balance Sheet**: "货币资金", "应收账款", "存货", "固定资产", "资产总计", ...
- **Income Statement**: "一、营业总收入", "其中：营业成本", "五、净利润", ...

Please analyze the text and output the structured data.`
                },
                {
                    role: "user",
                    content: `File Name: ${fileName}\n\nDocument Content:\n${text.substring(0, 30000)}`
                }
            ],
            response_format: zodResponseFormat(ExtractionResponseSchema, "financial_extraction"),
        });

        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error("AI extraction returned empty content");
        }

        const result = JSON.parse(content);

        return {
            type: result.documentType,
            data: result.data
        };
    } catch (error) {
        console.error("[AI Extraction] Error:", error);
        throw error;
    }
}
