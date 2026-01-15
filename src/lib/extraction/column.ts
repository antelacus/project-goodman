
import ExcelJS from 'exceljs';

// Balance Sheet Mapping
const BALANCE_SHEET_MAPPING: Record<string, string> = {
    "货币资金": "货币资金",
    "结算备付金": "结算备付金",
    "拆出资金": "拆出资金",
    "交易性金融资产": "交易性金融资产",
    "衍生金融资产": "衍生金融资产",
    "应收票据": "应收票据",
    "应收账款": "应收账款",
    "应收款项融资": "应收款项融资",
    "预付款项": "预付款项",
    "应收保费": "应收保费",
    "应收分保账款": "应收分保账款",
    "应收分保合同准备金": "应收分保合同准备金",
    "其他应收款": "其他应收款",
    "买入返售金融资产": "买入返售金融资产",
    "存货": "存货",
    "合同资产": "合同资产",
    "持有待售资产": "持有待售资产",
    "一年内到期的非流动资产": "一年内到期的非流动资产",
    "其他流动资产": "其他流动资产",
    "流动资产合计": "流动资产合计",

    "发放贷款和垫款": "发放贷款和垫款",
    "债权投资": "债权投资",
    "其他债权投资": "其他债权投资",
    "长期应收款": "长期应收款",
    "长期股权投资": "长期股权投资",
    "其他权益工具投资": "其他权益工具投资",
    "其他非流动金融资产": "其他非流动金融资产",
    "投资性房地产": "投资性房地产",
    "固定资产": "固定资产",
    "在建工程": "在建工程",
    "生产性生物资产": "生产性生物资产",
    "油气资产": "油气资产",
    "使用权资产": "使用权资产",
    "无形资产": "无形资产",
    "开发支出": "开发支出",
    "商誉": "商誉",
    "长期待摊费用": "长期待摊费用",
    "递延所得税资产": "递延所得税资产",
    "其他非流动资产": "其他非流动资产",
    "非流动资产合计": "非流动资产合计",
    "资产总计": "资产总计",

    "短期借款": "短期借款",
    "向中央银行借款": "向中央银行借款",
    "拆入资金": "拆入资金",
    "交易性金融负债": "交易性金融负债",
    "衍生金融负债": "衍生金融负债",
    "应付票据": "应付票据",
    "应付账款": "应付账款",
    "预收款项": "预收款项",
    "合同负债": "合同负债",
    "卖出回购金融资产款": "卖出回购金融资产款",
    "吸收存款及同业存放": "吸收存款及同业存放",
    "代理买卖证券款": "代理买卖证券款",
    "代理承销证券款": "代理承销证券款",
    "应付职工薪酬": "应付职工薪酬",
    "应交税费": "应交税费",
    "其他应付款": "其他应付款",
    "应付手续费及佣金": "应付手续费及佣金",
    "应付分保账款": "应付分保账款",
    "持有待售负债": "持有待售负债",
    "一年内到期的非流动负债": "一年内到期的非流动负债",
    "其他流动负债": "其他流动负债",
    "流动负债合计": "流动负债合计",

    "保险合同准备金": "保险合同准备金",
    "长期借款": "长期借款",
    "应付债券": "应付债券",
    "租赁负债": "租赁负债",
    "长期应付款": "长期应付款",
    "长期应付职工薪酬": "长期应付职工薪酬",
    "预计负债": "预计负债",
    "递延收益": "递延收益",
    "递延所得税负债": "递延所得税负债",
    "其他非流动负债": "其他非流动负债",
    "非流动负债合计": "非流动负债合计",

    "负债总计": "负债总计",

    "股本": "股本",
    "其他权益工具": "其他权益工具",
    "资本公积": "资本公积",
    "减：库存股": "减：库存股",
    "库存股": "减：库存股",
    "减:库存股": "减：库存股",
    "其他综合收益": "其他综合收益",
    "专项储备": "专项储备",
    "盈余公积": "盈余公积",
    "一般风险准备": "一般风险准备",
    "未分配利润": "未分配利润",
    "归属于母公司所有者权益合计": "归属于母公司所有者权益合计",
    "少数股东权益": "少数股东权益",
    "所有者权益合计": "所有者权益合计",
    "负债和所有者权益总计": "负债和所有者权益总计",
};

// Income Statement Mapping
const INCOME_STATEMENT_MAPPING: Record<string, string> = {
    "一、营业总收入": "一、营业总收入",
    "其中：营业收入": "其中：营业收入",
    "利息收入": "利息收入",
    "已赚保费": "已赚保费",
    "手续费及佣金收入": "手续费及佣金收入",
    "二、营业总成本": "二、营业总成本",
    "其中：营业成本": "其中：营业成本",
    "利息支出": "利息支出",
    "手续费及佣金支出": "手续费及佣金支出",
    "退保金": "退保金",
    "赔付支出净额": "赔付支出净额",
    "提取保险责任准备金净额": "提取保险责任准备金净额",
    "保单红利支出": "保单红利支出",
    "分保费用": "分保费用",
    "税金及附加": "税金及附加",
    "销售费用": "销售费用",
    "管理费用": "管理费用",
    "研发费用": "研发费用",
    "财务费用": "财务费用",
    "加：其他收益": "加：其他收益",
    "其他收益": "加：其他收益",
    "加:其他收益": "加：其他收益",
    "投资收益": "投资收益",
    "汇兑收益": "汇兑收益",
    "净敞口套期收益": "净敞口套期收益",
    "公允价值变动收益": "公允价值变动收益",
    "信用减值损失": "信用减值损失",
    "资产减值损失": "资产减值损失",
    "资产处置收益": "资产处置收益",
    "三、营业利润": "三、营业利润",
    "加：营业外收入": "加：营业外收入",
    "营业外收入": "加：营业外收入",
    "加:营业外收入": "加：营业外收入",
    "减：营业外支出": "减：营业外支出",
    "营业外支出": "减：营业外支出",
    "减:营业外支出": "减：营业外支出",
    "四、利润总额": "四、利润总额",
    "减：所得税费用": "减：所得税费用",
    "所得税费用": "减：所得税费用",
    "减:所得税费用": "减：所得税费用",
    "五、净利润": "五、净利润",
    "归属于母公司股东的净利润": "归属于母公司股东的净利润",
    "少数股东损益": "少数股东损益",
    "六、其他综合收益的税后净额": "六、其他综合收益的税后净额",
    "归属于母公司所有者的其他综合收益的税后净额": "归属于母公司所有者的其他综合收益的税后净额",
    "归属于少数股东的其他综合收益的税后净额": "归属于少数股东的其他综合收益的税后净额",
    "七、综合收益总额": "七、综合收益总额",
    "归属于母公司所有者的综合收益总额": "归属于母公司所有者的综合收益总额",
    "归属于少数股东的综合收益总额": "归属于少数股东的综合收益总额",
    "基本每股收益": "基本每股收益",
    "稀释每股收益": "稀释每股收益",
};

// Cash Flow Mapping (Placeholder - add if needed, or use generic)
const CASH_FLOW_MAPPING: Record<string, string> = {
    // --- 经营活动 ---
    "销售商品、提供劳务收到的现金": "销售商品、提供劳务收到的现金",
    "客户存款和同业存放款项净增加额": "客户存款和同业存放款项净增加额",
    "向中央银行借款净增加额": "向中央银行借款净增加额",
    "向其他金融机构拆入资金净增加额": "向其他金融机构拆入资金净增加额",
    "收到原保险合同保费取得的现金": "收到原保险合同保费取得的现金",
    "收到再保业务现金净额": "收到再保业务现金净额",
    "保户储金及投资款净增加额": "保户储金及投资款净增加额",
    "收取利息、手续费及佣金的现金": "收取利息、手续费及佣金的现金",
    "拆入资金净增加额": "拆入资金净增加额",
    "回购业务资金净增加额": "回购业务资金净增加额",
    "代理买卖证券收到的现金净额": "代理买卖证券收到的现金净额",
    "收到的税费返还": "收到的税费返还",
    "收到其他与经营活动有关的现金": "收到其他与经营活动有关的现金",

    "经营活动现金流入小计": "经营活动现金流入小计",

    "购买商品、接受劳务支付的现金": "购买商品、接受劳务支付的现金",
    "客户贷款及垫款净增加额": "客户贷款及垫款净增加额",
    "存放中央银行和同业款项净增加额": "存放中央银行和同业款项净增加额",
    "支付原保险合同赔付款项的现金": "支付原保险合同赔付款项的现金",
    "拆出资金净增加额": "拆出资金净增加额",
    "支付利息、手续费及佣金的现金": "支付利息、手续费及佣金的现金",
    "支付保单红利的现金": "支付保单红利的现金",
    "支付给职工以及为职工支付的现金": "支付给职工以及为职工支付的现金",
    "支付的各项税费": "支付的各项税费",
    "支付其他与经营活动有关的现金": "支付其他与经营活动有关的现金",

    "经营活动现金流出小计": "经营活动现金流出小计",

    "经营活动产生的现金流量净额": "经营活动产生的现金流量净额",

    // --- 投资活动 ---
    "收回投资收到的现金": "收回投资收到的现金",
    "取得投资收益收到的现金": "取得投资收益收到的现金",
    "处置固定资产、无形资产和其他长期资产收回的现金净额": "处置固定资产、无形资产和其他长期资产收回的现金净额",
    "处置子公司及其他营业单位收到的现金净额": "处置子公司及其他营业单位收到的现金净额",
    "收到其他与投资活动有关的现金": "收到其他与投资活动有关的现金",

    "投资活动现金流入小计": "投资活动现金流入小计",

    "购建固定资产、无形资产和其他长期资产支付的现金": "购建固定资产、无形资产和其他长期资产支付的现金",
    "投资支付的现金": "投资支付的现金",
    "质押贷款净增加额": "质押贷款净增加额",
    "取得子公司及其他营业单位支付的现金净额": "取得子公司及其他营业单位支付的现金净额",
    "支付其他与投资活动有关的现金": "支付其他与投资活动有关的现金",

    "投资活动现金流出小计": "投资活动现金流出小计",

    "投资活动产生的现金流量净额": "投资活动产生的现金流量净额",

    // --- 筹资活动 ---
    "吸收投资收到的现金": "吸收投资收到的现金",
    "取得借款收到的现金": "取得借款收到的现金",
    "收到其他与筹资活动有关的现金": "收到其他与筹资活动有关的现金",

    "筹资活动现金流入小计": "筹资活动现金流入小计",

    "偿还债务支付的现金": "偿还债务支付的现金",
    "分配股利、利润或偿付利息支付的现金": "分配股利、利润或偿付利息支付的现金",
    "支付其他与筹资活动有关的现金": "支付其他与筹资活动有关的现金",

    "筹资活动现金流出小计": "筹资活动现金流出小计",

    "筹资活动产生的现金流量净额": "筹资活动产生的现金流量净额",

    "四、汇率变动对现金及现金等价物的影响": "四、汇率变动对现金及现金等价物的影响",

    "五、现金及现金等价物净增加额": "五、现金及现金等价物净增加额",
    "加：期初现金及现金等价物余额": "加：期初现金及现金等价物余额",
    "期初现金及现金等价物余额": "加：期初现金及现金等价物余额",
    "加:期初现金及现金等价物余额": "加：期初现金及现金等价物余额",
    "六、期末现金及现金等价物余额": "六、期末现金及现金等价物余额",
};

export interface ColumnMapping {
    name: string;
    periodEnd: string;
    periodStart: string;
}

export interface ColumnExtractionOptions {
    year?: string;      // Year from form (e.g., "2024")
    period?: string;    // Period from form (e.g., "annual", "Q1")
    startDate?: string; // Optional start date for period comparison
    endDate?: string;   // Optional end date for current period
}

export async function performColumnBasedExtraction(
    fileBuffer: Buffer,
    mapping: ColumnMapping,
    startDate: string,
    endDate: string,
    documentType: string,
    options?: ColumnExtractionOptions
): Promise<{
    data: Array<{ year: string; period: string; content: Record<string, number> }>;
}> {
    console.log(`[Column Extraction] Starting with mapping:`, mapping);
    console.log(`[Column Extraction] Document Type:`, documentType);

    // Select the correct mapping based on document type
    let targetMapping: Record<string, string> = {};
    if (documentType === 'balance_sheet') {
        targetMapping = BALANCE_SHEET_MAPPING;
    } else if (documentType === 'income_statement') {
        targetMapping = INCOME_STATEMENT_MAPPING;
    } else if (documentType === 'cash_flow') {
        targetMapping = CASH_FLOW_MAPPING;
    } else {
        console.warn(`[Column Extraction] Unknown document type: ${documentType}, using empty mapping.`);
    }

    const workbook = new ExcelJS.Workbook();
    // REASON: exceljs types expect Buffer but Node.js 22+ returns Buffer<ArrayBuffer>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(fileBuffer as any);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
        throw new Error('Excel file has no worksheets');
    }

    // Convert worksheet to array of arrays (similar to xlsx header: 1)
    const rows: (string | number | null)[][] = [];
    worksheet.eachRow({ includeEmpty: true }, (row) => {
        const rowData: (string | number | null)[] = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            // Fill any gaps with null (exceljs may skip empty cells)
            while (rowData.length < colNumber - 1) {
                rowData.push(null);
            }
            const value = cell.value;
            if (value === null || value === undefined) {
                rowData.push(null);
            } else if (typeof value === 'object' && 'result' in value) {
                // Formula cell - get calculated result
                rowData.push(value.result as string | number | null);
            } else if (typeof value === 'object' && 'text' in value) {
                // Rich text cell - get text content
                rowData.push(value.text as string);
            } else {
                rowData.push(value as string | number);
            }
        });
        rows.push(rowData);
    });

    // Helper to get column index from letter (A -> 0, B -> 1)
    const getColIndex = (col: string) => {
        let index = 0;
        for (let i = 0; i < col.length; i++) {
            index = index * 26 + col.charCodeAt(i) - 64;
        }
        return index - 1;
    };

    const nameColIdx = getColIndex(mapping.name);
    const endColIdx = getColIndex(mapping.periodEnd);
    const startColIdx = getColIndex(mapping.periodStart);

    const contentEnd: Record<string, number> = {};
    const contentStart: Record<string, number> = {};

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rawName = row[nameColIdx];

        if (!rawName || typeof rawName !== 'string' || rawName.trim() === '') continue;

        const cleanName = rawName.trim().replace(/\s+/g, ''); // Remove spaces

        // 1. Try exact match first
        let standardKey = targetMapping[cleanName];

        // 2. If no exact match, try simple fuzzy match (contains)
        if (!standardKey) {
            const foundKey = Object.keys(targetMapping).find(k => cleanName.includes(k) || k.includes(cleanName));
            if (foundKey) {
                standardKey = targetMapping[foundKey];
            }
        }

        if (standardKey) {
            const valEnd = parseFloat(String(row[endColIdx]));
            const valStart = parseFloat(String(row[startColIdx]));

            if (!isNaN(valEnd)) contentEnd[standardKey] = valEnd;
            if (!isNaN(valStart)) contentStart[standardKey] = valStart;
        }
    }

    // Determine years - use form values if provided, otherwise parse from dates
    let endYear: string;
    let startYear: string;
    const period = options?.period || 'annual';

    if (options?.year) {
        // Use year from form
        endYear = options.year;
        // For start year, try to parse from startDate or use previous year
        if (startDate && startDate.length > 0) {
            const parsedStart = new Date(startDate);
            startYear = !isNaN(parsedStart.getTime())
                ? parsedStart.getFullYear().toString()
                : (parseInt(endYear) - 1).toString();
        } else {
            startYear = (parseInt(endYear) - 1).toString();
        }
    } else if (endDate && endDate.length > 0) {
        // Parse from dates
        const parsedEnd = new Date(endDate);
        const parsedStart = new Date(startDate);

        if (isNaN(parsedEnd.getTime())) {
            throw new Error('Invalid end date provided. Please provide a valid date or select a year.');
        }

        endYear = parsedEnd.getFullYear().toString();
        startYear = !isNaN(parsedStart.getTime())
            ? parsedStart.getFullYear().toString()
            : (parseInt(endYear) - 1).toString();
    } else {
        throw new Error('Year is required. Please select a year for this financial document.');
    }

    console.log(`[Column Extraction] Using years: end=${endYear}, start=${startYear}, period=${period}`);

    // Build result - only include data that has content
    const result: Array<{ year: string; period: string; content: Record<string, number> }> = [];

    if (Object.keys(contentEnd).length > 0) {
        result.push({
            year: endYear,
            period: period,
            content: contentEnd
        });
    }

    if (Object.keys(contentStart).length > 0) {
        result.push({
            year: startYear,
            period: period,
            content: contentStart
        });
    }

    if (result.length === 0) {
        throw new Error('No financial data could be extracted from the document. Please check the column mapping.');
    }

    return { data: result };
}
