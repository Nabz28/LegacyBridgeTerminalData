"""
Batch 12 — Demographics, Energy, Population & Misc Macro
125 RICs: population dynamics, energy & environment, sales/orders/inventories,
labor, fiscal, retail, BoP-adjacent and miscellaneous macro.
"""

TIER1: dict[str, dict] = {

    # ── POPULATION / DEMOGRAPHICS ──────────────────────────────────────────

    "aCNCNKJKM1": {
        "meaning": (
            "Insurance employees holding senior professional titles at Huahui Life Insurance Co. "
            "Annual series from NBS/CIRC (China Banking and Insurance Regulatory Commission). "
            "Tracks skilled-labor depth inside the life-insurance sector — a niche demographic "
            "cut on specialized financial-services employment."
        ),
        "how_to_use": (
            "Use as a micro-indicator of senior talent accumulation in the domestic insurance "
            "industry. China's aging population is the structural tailwind: the 65+ cohort is "
            "projected to rise from ~14% (2024) to ~30% by 2050, dramatically expanding demand "
            "for life and annuity products. Rising senior staff signals capacity build-out to "
            "meet that demand. Cross-reference with total insurance premium growth and bancassurance "
            "channel data to gauge industry health."
        ),
        "related_series": ["aCNCNKJBP", "aCNCNPDZM", "aCNCNKPYC", "aCNCNQBHHM"],
    },

    "aCNCNOQGA": {
        "meaning": (
            "Number of civil aircraft in service (book inventory) nationwide. Annual series "
            "published by CAAC (Civil Aviation Administration of China) / NBS. Measures the "
            "registered fleet size of China's civil aviation industry."
        ),
        "how_to_use": (
            "A long-run proxy for aviation sector capital investment and consumer-mobility "
            "capacity. China's domestic aviation market is the world's largest by passenger "
            "volume. Fleet growth ties to urbanization (67% urbanization rate) and rising "
            "middle-class travel demand. Stagnation or contraction signals COVID-era capacity "
            "cuts or financial stress among carriers. Cross-check with passenger-km data and "
            "aircraft orders from COMAC/Boeing/Airbus."
        ),
        "related_series": ["aCNCNNNBR", "aCNCNAOJM", "aCNPOPT", "aCNCNODEEM"],
    },

    "aCNCNKCUB": {
        "meaning": (
            "Daily stays by Macao compatriots involved in stylistic technology exchange activities. "
            "Annual NBS tourism/cross-boundary flow statistic for Macao resident visits to mainland "
            "China classified under cultural/technology exchange purposes."
        ),
        "how_to_use": (
            "Niche bilateral mobility indicator between Macao SAR and the mainland. Useful for "
            "tracking cross-boundary economic integration under the Greater Bay Area (GBA) "
            "development framework. Rising stays signal deepening GBA collaboration in services "
            "and knowledge transfer. Context: Macao's economy is overwhelmingly gaming/tourism, "
            "so technology-exchange visits represent a policy-driven diversification signal."
        ),
        "related_series": ["aCNCNHMYF", "aCNCNKMUE", "aCNCNLMUS", "aCNCNAOJM"],
    },

    "aCNCNNNBR": {
        "meaning": (
            "Domestic tourists in rural areas whose trip purpose is classified as a business trip, "
            "broken down by undergraduate and junior-college education level. Annual NBS cultural "
            "tourism statistic combining rural tourism flows with traveler education profile."
        ),
        "how_to_use": (
            "Tracks rural tourism's business-travel segment filtered by education attainment — "
            "a proxy for skilled-worker mobility into rural areas (e.g., rural revitalization "
            "programs, agri-tech transfers). Rising educated business travelers to rural areas "
            "supports the government's Rural Revitalization Strategy narrative. Cross-reference "
            "with rural disposable income and agricultural GDP growth."
        ),
        "related_series": ["aCNCNAOJM", "aCNCNLSYL", "aCNCNQQBR", "aCNPOPT"],
    },

    "aCNCNAOJM": {
        "meaning": (
            "Number of foreign visitors who stayed overnight, French nationals, in Yinchuan city "
            "(Ningxia Hui Autonomous Region). Annual NBS inbound tourism statistic at city level."
        ),
        "how_to_use": (
            "City-level inbound tourism from France — a granular indicator of Silk Road / Belt "
            "and Road tourism appeal. Yinchuan is a gateway to China's Islamic heritage tourism. "
            "France is China's top European tourism source market in some years. Use alongside "
            "total inbound tourism and bilateral trade data (China-France) to gauge soft-power "
            "and people-to-people connectivity trends."
        ),
        "related_series": ["aCNCNLSYL", "aCNCNGOZI", "aCNCNLMUS", "aCNCNKMUE"],
    },

    "aCNCNLSYL": {
        "meaning": (
            "Number of foreign visitors who stayed overnight, Malaysian nationals, in Jilin Province. "
            "Annual NBS inbound tourism statistic at province level."
        ),
        "how_to_use": (
            "Tracks ASEAN-origin inbound tourism into Northeast China — a region with close ethnic "
            "and trade ties to Southeast Asia. Malaysia is a major source of Chinese diaspora "
            "tourists. Northeast China (Jilin) is also a hub for border trade with Russia and "
            "North Korea. Use with ASEAN bilateral trade data and China visa-policy changes to "
            "understand tourism and mobility trends."
        ),
        "related_series": ["aCNCNAOJM", "aCNCNGOZI", "aCNCNHMYF", "aCNCNKMUE"],
    },

    "aCNCNGOZI": {
        "meaning": (
            "Number of foreign visitors who stayed overnight, Philippine nationals, in Ningbo city "
            "(Zhejiang Province). Annual NBS inbound tourism statistic at city level."
        ),
        "how_to_use": (
            "Ningbo is a major port and manufacturing hub; Philippine overnight stays reflect "
            "trade-related travel (business, logistics) as much as leisure. Philippines-China "
            "relations are sensitive due to South China Sea disputes — track alongside bilateral "
            "diplomatic indicators. Drops may signal political cooling; rebounds track "
            "rapprochement periods."
        ),
        "related_series": ["aCNCNLSYL", "aCNCNAOJM", "aCNCNLMUS", "aCNCNKCUB"],
    },

    "aCNCNLMUS": {
        "meaning": (
            "Number of foreign visitors who stayed overnight, South Korean nationals, in Chengde "
            "city (Hebei Province). Annual NBS inbound tourism statistic at city level."
        ),
        "how_to_use": (
            "South Korea is China's largest single source of inbound tourists (pre-pandemic). "
            "Chengde is a cultural heritage site near Beijing. Korean overnight stays are highly "
            "sensitive to bilateral relations — the THAAD missile defense dispute (2017) caused "
            "a sharp drop. Monitor alongside Korea-China diplomatic calendar and China outbound "
            "tourism data for cross-verification."
        ),
        "related_series": ["aCNCNAOJM", "aCNCNGOZI", "aCNCNKMUE", "aCNCNHMYF"],
    },

    "aCNCNKMUE": {
        "meaning": (
            "Number of overnight visitors from Taiwan compatriots, in Harbin city (Heilongjiang "
            "Province). Annual NBS cross-strait inbound tourism statistic at city level."
        ),
        "how_to_use": (
            "Taiwan compatriot overnight stays in Northeast China track cross-strait people-to-people "
            "ties. Harbin — Russia border region — suggests some stays relate to third-country "
            "transit. Trends here are politically sensitive: China's cross-strait travel policies, "
            "Taiwan election cycles, and PRC military exercises all influence volumes. Use with "
            "cross-strait trade and investment data for a fuller picture."
        ),
        "related_series": ["aCNCNHMYF", "aCNCNLMUS", "aCNCNKCUB", "aCNCNAOJM"],
    },

    "aCNCNHMYF": {
        "meaning": (
            "Number of overnight visitors from Macao compatriots received in Yanbian Korean "
            "Autonomous Prefecture (Jilin Province). Annual NBS cross-boundary tourism statistic "
            "at prefecture level."
        ),
        "how_to_use": (
            "Yanbian has a large ethnic Korean population and borders North Korea and Russia. "
            "Macao compatriot visits here are atypical (Macao-to-Northeast China flows are small) "
            "and may reflect specialty tourism, family visits, or diaspora ties. The series is "
            "more useful as part of a mosaic of intra-China mobility indicators than as a "
            "standalone macro driver."
        ),
        "related_series": ["aCNCNKMUE", "aCNCNKCUB", "aCNCNLSYL", "aCNCNAOJM"],
    },

    "aCNCNODEEM": {
        "meaning": (
            "Internet broadband access users, total nationwide. Monthly series published by MIIT "
            "(Ministry of Industry and Information Technology). Counts fixed and mobile broadband "
            "subscriber accounts."
        ),
        "how_to_use": (
            "China has ~1.1 billion internet users and the world's largest e-commerce market. "
            "Broadband subscriber growth is a leading indicator of digital-economy expansion — "
            "underpinning online retail (28% share of total retail), fintech, cloud computing, "
            "and digital-yuan adoption. Slowdown in subscriber growth signals market saturation "
            "and a shift from user acquisition to ARPU (revenue-per-user) expansion. Pair with "
            "online retail sales (aCNCNROGS) and 5G rollout data."
        ),
        "related_series": ["aCNCNROGS", "aCNCNJKNZ", "aCNCNNDPW", "aCNWRTCOS"],
    },

    "aCNCNIMXA": {
        "meaning": (
            "Beds in medical institutions, Bei'an city (Heilongjiang Province). Annual NBS "
            "healthcare infrastructure statistic at city level."
        ),
        "how_to_use": (
            "Healthcare bed capacity is a critical demographic policy variable. China's aging "
            "population requires rapid expansion of medical infrastructure: the 65+ cohort "
            "is projected to reach 30% of population by 2050, implying enormous pressure on "
            "hospital capacity. Track Northeast China (Heilongjiang) healthcare data carefully — "
            "the region has an older-than-average population and faces rural healthcare gaps. "
            "Use with fiscal health-spending data for policy context."
        ),
        "related_series": ["aCNCNEWKJ", "aCNCNLOXZ", "aCNCNBXBK", "aCNCNCKZV"],
    },

    "aCNCNEWKJ": {
        "meaning": (
            "Beds in medical institutions, Hejin city (Shanxi Province). Annual NBS healthcare "
            "infrastructure statistic at city level."
        ),
        "how_to_use": (
            "Shanxi is a coal-heavy province undergoing economic restructuring. Healthcare bed "
            "data here tracks whether declining coal revenues are constraining local government "
            "social-service spending — a fiscal stress indicator at the sub-provincial level. "
            "LGFV (local government financing vehicle) indebtedness in resource-dependent provinces "
            "like Shanxi directly affects healthcare capex. Pair with land sales revenue and "
            "local fiscal deficit data."
        ),
        "related_series": ["aCNCNIMXA", "aCNCNLOXZ", "aCNCNBXBK", "aCNCNCKZV"],
    },

    "aCNCNLOXZ": {
        "meaning": (
            "Beds in medical institutions, Shayang County (Hubei Province). Annual NBS healthcare "
            "infrastructure statistic at county level."
        ),
        "how_to_use": (
            "County-level hospital bed data is a direct measure of rural healthcare access — "
            "a key policy gap given hukou-system barriers that restrict rural migrants from "
            "accessing urban healthcare. Hubei (Wuhan) post-COVID healthcare investment has been "
            "elevated. Rising county-level bed counts support the 'Healthy China 2030' policy "
            "benchmark. Cross-reference with NHC (National Health Commission) national targets."
        ),
        "related_series": ["aCNCNIMXA", "aCNCNEWKJ", "aCNCNBXBK", "aCNCNCKZV"],
    },

    "aCNCNBXBK": {
        "meaning": (
            "Beds in medical institutions, Xihua County (Henan Province). Annual NBS healthcare "
            "infrastructure statistic at county level."
        ),
        "how_to_use": (
            "Henan is China's most populous province (~100M people) and a major source of "
            "migrant workers. County-level medical beds here capture primary-care infrastructure "
            "for the rural population that remains behind after migration. Henan faces significant "
            "aging-in-place pressure as younger workers relocate to coastal cities. Use alongside "
            "NHC national bed-to-population ratio targets and rural health insurance enrollment."
        ),
        "related_series": ["aCNCNIMXA", "aCNCNLOXZ", "aCNCNEWKJ", "aCNCNQBHHM"],
    },

    "aCNCNQQBR": {
        "meaning": (
            "Durable consumer goods in rural residential units — home cars — Tibet Autonomous "
            "Region. Annual NBS rural household survey statistic measuring car ownership per "
            "100 rural households in Tibet."
        ),
        "how_to_use": (
            "Car ownership in rural Tibet is a frontier-market consumer development indicator. "
            "Tibet has among the lowest per-capita incomes nationally but has benefited from "
            "large government transfer payments and infrastructure build-out (Qinghai-Tibet "
            "Railway, road network). Rising rural car ownership tracks income growth, road "
            "infrastructure, and new-energy vehicle penetration in remote markets. Use with "
            "national rural durable-goods data and NEV subsidy policies."
        ),
        "related_series": ["aCNCNZHYBM", "aCNWRTCOS", "aCNCNROGS", "aCNPOPT"],
    },

    "aCNCNVSQV": {
        "meaning": (
            "Enrollment in primary education, nationwide total. Annual series published by the "
            "Ministry of Education (MoE) / NBS. Counts students enrolled in grades 1-6."
        ),
        "how_to_use": (
            "Primary school enrollment is a lagged demographic dividend indicator — it reflects "
            "birth cohorts from 6 years prior. China's record-low birth rate (~6.5 births per "
            "1,000 people) means primary enrollment will decline structurally for decades. "
            "This has profound implications: school closures, teacher layoffs, and collapse of "
            "the education services sector. Investors in private K-12 education (already hit by "
            "the 2021 'Double Reduction' crackdown) should monitor enrollment trends closely."
        ),
        "related_series": ["aCNCNDSVF", "aCNCNJLLN", "aCNCNAOM", "aCNPOPF"],
    },

    "aCNCNNDPW": {
        "meaning": (
            "Fixed telephone users, Wuyuan Yi Autonomous County (Inner Mongolia). Annual NBS "
            "telecommunications infrastructure statistic at county level."
        ),
        "how_to_use": (
            "Fixed-line penetration in remote areas like Wuyuan (Inner Mongolia) measures the "
            "digital infrastructure baseline in resource-rich but sparsely populated regions. "
            "Inner Mongolia is a major coal and rare-earth producer; connectivity quality affects "
            "logistics and industrial coordination. Decline in fixed-line users signals mobile "
            "substitution — track alongside mobile broadband rollout and 5G coverage data."
        ),
        "related_series": ["aCNCNJKNZ", "aCNCNODEEM", "aCNCNNMVM", "aCNCNGBWH"],
    },

    "aCNCNCYQI": {
        "meaning": (
            "Full-time teachers in ordinary colleges and universities, urban area, Dazhou city "
            "(Sichuan Province). Frequency not specified (likely annual). NBS education statistic "
            "at city level."
        ),
        "how_to_use": (
            "Higher-education faculty count in a Sichuan inland city tracks the expansion of "
            "university capacity into China's interior — a policy goal since the 'Go West' "
            "strategy. Sichuan's universities feed the Chengdu-Chongqing tech corridor. "
            "A declining faculty count would signal fiscal austerity or enrollment contraction "
            "driven by the demographic squeeze. Pair with graduate output data and youth "
            "unemployment (historically 20%+ in 2023 before the series was suspended)."
        ),
        "related_series": ["aCNCNMJBY", "aCNCNIKBL", "aCNCNVSQV", "aCNCNDKV"],
    },

    "aCNCNMJBY": {
        "meaning": (
            "Full-time teachers in ordinary colleges and universities, urban area, Laibin city "
            "(Guangxi Province). Frequency not specified (likely annual). NBS education statistic "
            "at city level."
        ),
        "how_to_use": (
            "Laibin is a mid-sized city in China's southwestern frontier (Guangxi borders Vietnam). "
            "University teacher numbers here reflect the rollout of higher education into inland "
            "China as coastal universities saturate. Track against Guangxi's GDP per capita growth "
            "and the China-ASEAN corridor trade flows — educated labor is critical for supply-chain "
            "upgrading in border trade zones."
        ),
        "related_series": ["aCNCNCYQI", "aCNCNIKBL", "aCNCNVSQV", "aCNCNSYYO"],
    },

    "aCNCNAOM": {
        "meaning": (
            "Full-time teachers in ordinary middle schools, Ningcheng County (Inner Mongolia). "
            "Frequency not specified (likely annual). NBS education statistic at county level."
        ),
        "how_to_use": (
            "Secondary school teacher counts in Inner Mongolia reflect both demographic trends "
            "(declining school-age population) and rural teacher retention challenges. Inner "
            "Mongolia faces significant rural depopulation as young people migrate to Hohhot, "
            "Beijing, and coastal cities. Declining teacher counts can lead to school consolidation "
            "— a policy concern for rural community viability and the hukou reform debate."
        ),
        "related_series": ["aCNCNIKBL", "aCNCNDKV", "aCNCNVSQV", "aCNCNSIGP"],
    },

    "aCNCNIKBL": {
        "meaning": (
            "Full-time teachers in ordinary middle schools, urban area, Luliang city (Shanxi "
            "Province). Annual NBS education statistic at city level."
        ),
        "how_to_use": (
            "Luliang is Shanxi's coal heartland. Urban middle-school teacher retention here "
            "reflects the broader health of the local coal economy — when coal revenues fall, "
            "local government wages (including teachers) come under pressure. Post-2021 coal "
            "price surge would have supported fiscal stability; the energy transition threatens "
            "Shanxi's long-term fiscal base. Pair with coal output data and local government "
            "revenue statistics."
        ),
        "related_series": ["aCNCNAOM", "aCNCNDKV", "aCNCNEWKJ", "aCNT2SPSRCW"],
    },

    "aCNCNDKV": {
        "meaning": (
            "Full-time teachers in ordinary middle schools, Wen'an County (Hebei Province). "
            "Annual NBS education statistic at county level."
        ),
        "how_to_use": (
            "Wen'an (Hebei) sits in the Beijing-Tianjin-Hebei (Jing-Jin-Ji) integration zone. "
            "Teacher counts here track whether population and economic activity is migrating "
            "outward from Beijing as part of the coordinated development strategy (including "
            "Xiong'an New Area). Rising teacher numbers could signal in-migration from Beijing "
            "spillover; declines signal rural hollowing."
        ),
        "related_series": ["aCNCNAOM", "aCNCNIKBL", "aCNCNVSQV", "aCNCNDSVF"],
    },

    "aCNCNJKNZ": {
        "meaning": (
            "Number of broadband access users, Xingping city (Shaanxi Province). Frequency not "
            "specified (likely annual or monthly). NBS / MIIT telecom statistic at city level."
        ),
        "how_to_use": (
            "Broadband penetration in a tier-3/4 Shaanxi city tracks digital inclusion in "
            "China's interior. Xingping (near Xi'an) sits on the ancient Silk Road and is "
            "part of the Guanzhong Plain urban cluster. Broadband growth enables e-commerce "
            "adoption (Alibaba's Rural Taobao program), digital payments, and remote work — "
            "all driving consumption upgrades in inland China."
        ),
        "related_series": ["aCNCNODEEM", "aCNCNNDPW", "aCNCNROGS", "aCNCNZHYBM"],
    },

    "aCNCNGETJ": {
        "meaning": (
            "Number of city parks, Hubei Province. Annual NBS urban environment / public "
            "infrastructure statistic at province level."
        ),
        "how_to_use": (
            "Urban park counts reflect green-infrastructure investment and the quality of urban "
            "living — directly tied to the 'Ecological Civilization' policy framework. Hubei "
            "(Wuhan) has accelerated park construction post-COVID as part of urban renewal. "
            "Green space per capita is a quality-of-life metric influencing internal migration "
            "patterns and talent attraction for the Wuhan tech cluster."
        ),
        "related_series": ["aCNCNKFCR", "aCNCNEVEK", "aCNCNNUKD", "aCNCNGBWH"],
    },

    "aCNCNCKZV": {
        "meaning": (
            "Number of health workers (practicing and assistant physicians) in hospitals and "
            "health centers, urban area, Fuyang City (Anhui Province). Annual NBS / NHC "
            "healthcare workforce statistic."
        ),
        "how_to_use": (
            "Physician density in urban Fuyang (a major Anhui migrant-sending city) measures "
            "healthcare workforce depth in a transition economy. Fuyang sends ~3M migrant workers "
            "to coastal cities; the resident population skews older. Physician shortages are "
            "a direct constraint on coping with an aging population. Track against national "
            "physician-to-population ratios (target: 3.2 per 1,000) and healthcare spending growth."
        ),
        "related_series": ["aCNCNIMXA", "aCNCNEWKJ", "aCNCNLOXZ", "aCNCNQBHHM"],
    },

    "aCNCNSIGP": {
        "meaning": (
            "Number of ordinary primary schools, Altay city (Xinjiang Uyghur Autonomous Region). "
            "Frequency not specified (likely annual). NBS education statistic at city level."
        ),
        "how_to_use": (
            "School counts in Xinjiang are a politically sensitive demographic indicator. Government "
            "education investment in Xinjiang has been large (boarding school expansion). Declining "
            "school numbers amid rising investment would signal consolidation; rising numbers track "
            "stated policy. Cross-reference with birth rate data for Xinjiang — a region where "
            "demographic trends have been hotly debated internationally."
        ),
        "related_series": ["aCNCNSYYO", "aCNCNVSQV", "aCNCNDSVF", "aCNCNAOM"],
    },

    "aCNCNSYYO": {
        "meaning": (
            "Number of ordinary secondary schools, urban area, Tongren city (Guizhou Province). "
            "Annual NBS education statistic at city level."
        ),
        "how_to_use": (
            "Guizhou is one of China's poorest provinces but has seen rapid development due to "
            "data-center investment (Guizhou Big Data Strategy) and targeted poverty alleviation. "
            "Secondary school counts in Tongren track educational infrastructure build-out to "
            "support the skilled-labor pipeline needed to sustain this growth. Use with Guizhou "
            "GDP per capita and e-commerce penetration data."
        ),
        "related_series": ["aCNCNSIGP", "aCNCNVKHO", "aCNCNTSOE", "aCNCNVSQV"],
    },

    "aCNCNXQZ": {
        "meaning": (
            "Students in ordinary higher education institutions, urban area, Wuxi city (Jiangsu "
            "Province). Frequency not specified (likely annual). NBS education statistic at "
            "city level."
        ),
        "how_to_use": (
            "Wuxi is a high-tech manufacturing hub (semiconductors, IoT, solar panels). University "
            "enrollment reflects the local skilled-labor supply pipeline critical for these "
            "industries. Cross-reference with Wuxi's semiconductor output and investment in "
            "strategic industries (integrated circuits, new materials). In China's semiconductor "
            "self-sufficiency push (post-US export controls), Wuxi-area talent depth is a "
            "key constraint."
        ),
        "related_series": ["aCNCNCYQI", "aCNCNMJBY", "aCNCNVSQV", "aCNCNOBSX"],
    },

    "aCNCNDSVF": {
        "meaning": (
            "Ordinary primary school students, Changsha County (Hunan Province). Annual NBS "
            "education enrollment statistic at county level."
        ),
        "how_to_use": (
            "Changsha County sits within Changsha's metro area — one of China's most dynamic "
            "inland cities. Primary enrollment here is a leading demographic indicator: Changsha "
            "has attracted significant internal migration and has a relatively young population "
            "profile compared to Northeast China. Stable or rising enrollment signals continued "
            "migration inflow; declines would foreshadow future labor supply constraints in "
            "Hunan's manufacturing sector."
        ),
        "related_series": ["aCNCNJLLN", "aCNCNVSQV", "aCNCNYUF", "aCNCNUBVL"],
    },

    "aCNCNYUF": {
        "meaning": (
            "Ordinary primary school students, Dayao County (Yunnan Province). Frequency not "
            "specified (likely annual). NBS education enrollment statistic at county level."
        ),
        "how_to_use": (
            "Dayao is a rural county in Yunnan — a province that borders Myanmar, Laos, and Vietnam "
            "and is a key BRI (Belt and Road Initiative) connectivity node. Enrollment trends here "
            "reflect rural demographic pressures and the effectiveness of poverty-alleviation "
            "education subsidies. Yunnan's minority populations have historically lower education "
            "attainment; policy-driven improvements would show up in these series."
        ),
        "related_series": ["aCNCNDSVF", "aCNCNUBVL", "aCNCNZBUR", "aCNCNKXTQ"],
    },

    "aCNCNUBVL": {
        "meaning": (
            "Ordinary primary school students, Luquan District (Shijiazhuang, Hebei Province). "
            "Annual NBS education enrollment statistic at district level."
        ),
        "how_to_use": (
            "Shijiazhuang is Hebei's capital in the Beijing-Tianjin-Hebei integration zone. "
            "Luquan District primary enrollment tracks demographic momentum in a peri-urban "
            "area absorbing some Beijing population dispersal. Monitor alongside Xiong'an New "
            "Area development and Jing-Jin-Ji integration-zone migration data."
        ),
        "related_series": ["aCNCNDSVF", "aCNCNHKR", "aCNCNZBUR", "aCNCNVSQV"],
    },

    "aCNCNZBUR": {
        "meaning": (
            "Ordinary primary school students, Ninglang Yi Autonomous County (Yunnan Province). "
            "Frequency not specified (likely annual). NBS education statistic for a minority "
            "autonomous county."
        ),
        "how_to_use": (
            "Ninglang (Yi ethnic area, Lijiang region) is one of China's last-designated poverty "
            "alleviation counties. Primary enrollment here tracks success of the mandatory "
            "education expansion policy in remote minority regions. Improvement signals poverty "
            "alleviation progress; persistent gaps highlight hukou/registration barriers and "
            "geographic disadvantage."
        ),
        "related_series": ["aCNCNYUF", "aCNCNKXTQ", "aCNCNUBVL", "aCNCNSIGP"],
    },

    "aCNCNHKR": {
        "meaning": (
            "Ordinary primary school students, urban area, Xinxiang city (Henan Province). "
            "Annual NBS education enrollment statistic at city level."
        ),
        "how_to_use": (
            "Xinxiang is a mid-sized Henan city. Urban primary enrollment here reflects internal "
            "migration into city centers from surrounding rural Henan counties. As China's most "
            "populous province, Henan's demographic trends are bellwethers. Declining enrollment "
            "signals the demographic squeeze reaching interior cities; it also presages future "
            "reductions in consumer demand and labor supply in these markets."
        ),
        "related_series": ["aCNCNDSVF", "aCNCNUBVL", "aCNCNVSQV", "aCNPOPT"],
    },

    "aCNPOPT": {
        "meaning": (
            "China total population (all residents). Annual series published by NBS (National "
            "Bureau of Statistics). The headline demographic indicator measuring total population "
            "at year-end."
        ),
        "how_to_use": (
            "CRITICAL macro story: China's population peaked in 2022 at ~1.412B and has been "
            "declining since (-850K in 2022, accelerating to ~2-3M/year). This is the most "
            "consequential structural shift in the global economy: fewer consumers, shrinking "
            "labor force (peaked 2014), rising dependency ratios, and mounting pension/healthcare "
            "liabilities. The decline is irreversible given a TFR of ~1.0 (vs 2.1 replacement). "
            "Implications: property demand long-run decline, consumption slowdown, productivity "
            "imperative (automation/AI), and fiscal strain. Cross-reference with aCNPOPF for "
            "gender split and aCNCNVSQV for birth cohort tracking."
        ),
        "related_series": ["aCNPOPF", "aCNCNVSQV", "aCNCNQBHHM", "aCNCNBHEI"],
    },

    "aCNCNFLCP": {
        "meaning": (
            "Population density at township level, Guangdong Province. Frequency not specified "
            "(likely annual). NBS census-derived statistic measuring persons per sq km at "
            "township granularity."
        ),
        "how_to_use": (
            "Guangdong is China's most populous and economically productive province (GDP ~CNY 14T). "
            "Township-level density data reveals the extraordinary spatial concentration of the "
            "Pearl River Delta — contrasting dense manufacturing zones with rural hinterlands. "
            "Use to track urbanization within Guangdong and assess labor availability for "
            "manufacturing. Also relevant to hukou reform debates (Guangdong has the largest "
            "floating migrant population)."
        ),
        "related_series": ["aCNCNOAWM", "aCNPOPT", "aCNPOPF", "aCNCNNMVM"],
    },

    "aCNCNOAWM": {
        "meaning": (
            "Population density at township level, Jilin Province. Frequency not specified "
            "(likely annual). NBS census-derived statistic measuring persons per sq km at "
            "township granularity."
        ),
        "how_to_use": (
            "Jilin exemplifies China's Northeast demographic crisis: the province has been losing "
            "population through out-migration for two decades. Township density data shows a "
            "hollowing pattern — some areas are approaching depopulation. This has direct "
            "implications for Northeast revitalization policy credibility and for agricultural "
            "land consolidation (Jilin is a major grain-producing province). Pair with GDP "
            "per capita and migration flow data."
        ),
        "related_series": ["aCNCNFLCP", "aCNPOPT", "aCNCNNMVM", "aCNCNGBWH"],
    },

    "aCNPOPF": {
        "meaning": (
            "Female population, China total. Annual series published by NBS. Measures the total "
            "number of female residents at year-end."
        ),
        "how_to_use": (
            "The male-female ratio (gender imbalance) is a critical structural indicator of "
            "China's demographic trajectory. Decades of the One-Child Policy with son preference "
            "created a sex ratio at birth of ~117 males per 100 females (vs natural ~105). "
            "This imbalance — ~30-35M 'missing women' — depresses marriage rates and fertility "
            "further, reinforcing the TFR decline. Use aCNPOPF with aCNPOPT to derive the "
            "implicit male population and sex ratio trend."
        ),
        "related_series": ["aCNPOPT", "aCNCNVSQV", "aCNCNCYKD", "aCNCNJLLN"],
    },

    "aCNCNCYKD": {
        "meaning": (
            "Primary school students, Akesai Kazakh Autonomous County (Gansu Province). Annual "
            "NBS education statistic for a Kazakh ethnic minority autonomous county."
        ),
        "how_to_use": (
            "Akesai (Gansu-Xinjiang border) is a remote, sparsely populated county. School "
            "enrollment here is a direct read on demographic viability of a remote pastoral "
            "community. Rising enrollment can signal improved education access via government "
            "boarding school programs; sharp drops suggest depopulation. Context: China's "
            "western minority regions receive preferential birth policies (historically not "
            "subject to One-Child limits), so fertility rates here differ from Han majority."
        ),
        "related_series": ["aCNCNJLLN", "aCNCNKXTQ", "aCNCNZFUM", "aCNCNSIGP"],
    },

    "aCNCNJLLN": {
        "meaning": (
            "Primary school students, Anda city (Heilongjiang Province). Annual NBS education "
            "enrollment statistic at city level."
        ),
        "how_to_use": (
            "Anda (Heilongjiang) is in Northeast China's agricultural heartland — a region of "
            "severe demographic decline. Enrollment trends here are among the most negative in "
            "China, reflecting out-migration and extremely low birth rates in the Northeast "
            "(TFR estimated below 0.8 in Heilongjiang — among the world's lowest). This presages "
            "deep future labor shortages and school system collapse in the region."
        ),
        "related_series": ["aCNCNCYKD", "aCNCNDSVF", "aCNCNVSQV", "aCNCNOBSX"],
    },

    "aCNCNKXTQ": {
        "meaning": (
            "Primary school students, Baiyu County (Ganzi Tibetan Autonomous Prefecture, Sichuan "
            "Province). Annual NBS education enrollment statistic at county level."
        ),
        "how_to_use": (
            "Baiyu County is one of China's highest-altitude, most remote county-level units — "
            "part of the Tibetan Plateau ecological zone. Enrollment tracks the demographic "
            "resilience of nomadic/semi-nomadic Tibetan communities subject to resettlement "
            "and schooling programs. Context for ecological migration policies and the tension "
            "between pastoral livelihoods and environmental protection in the Three-River "
            "Headwaters region."
        ),
        "related_series": ["aCNCNCYKD", "aCNCNZFUM", "aCNCNYUF", "aCNCNZBUR"],
    },

    "aCNCNZFUM": {
        "meaning": (
            "Primary school students, Maqin County (Golog Tibetan Autonomous Prefecture, Qinghai "
            "Province). Annual NBS education enrollment statistic at county level."
        ),
        "how_to_use": (
            "Maqin is the seat of Golog Prefecture on the Yellow River headwaters. School "
            "enrollment among Tibetan pastoralists tracks the success of China's mandatory "
            "9-year education policy extension into remote areas. Government boarding schools "
            "dominate in this geography. Enrollment changes reflect both demographic trends and "
            "the pace of sedentarization/urbanization of nomadic communities."
        ),
        "related_series": ["aCNCNKXTQ", "aCNCNCYKD", "aCNCNYUF", "aCNCNSIGP"],
    },

    "aCNCNSGZR": {
        "meaning": (
            "Primary school students, Xiajiang County (Ji'an city, Jiangxi Province). Annual "
            "NBS education enrollment statistic at county level."
        ),
        "how_to_use": (
            "Jiangxi is a major labor-exporting province; Xiajiang's primary enrollment reflects "
            "rural demographic trends in a county where many working-age adults have migrated "
            "to coastal factories. Left-behind children and grandparent households are common, "
            "raising quality-of-education concerns. Monitor alongside Jiangxi's out-migration "
            "data and rural per-capita income."
        ),
        "related_series": ["aCNCNKLQZ", "aCNCNDSVF", "aCNCNHKR", "aCNCNVSQV"],
    },

    "aCNCNKLQZ": {
        "meaning": (
            "Primary school students, Yongxing County (Chenzhou city, Hunan Province). Annual "
            "NBS education enrollment statistic at county level."
        ),
        "how_to_use": (
            "Yongxing is a resource county (non-ferrous metals, especially lead-zinc). "
            "Enrollment trends integrate demographic change and industrial cycle effects: "
            "when mining is profitable, local incomes rise and population stability improves; "
            "in downturns, out-migration accelerates. Use with non-ferrous metals output data "
            "(aCNT2SPSRNF) and Hunan provincial economic indicators."
        ),
        "related_series": ["aCNCNSGZR", "aCNCNDSVF", "aCNT2SPSRNF", "aCNCNVSQV"],
    },

    "aCNCNYFDM": {
        "meaning": (
            "Registered students in post-certificate training programs. Frequency not specified "
            "(likely annual). NBS / MoE vocational education statistic measuring enrollment in "
            "continuing education and skills-upgrade courses."
        ),
        "how_to_use": (
            "Post-certificate (continuing/vocational) training enrollment is a policy barometer "
            "for China's skills-upgrading drive. The 14th Five-Year Plan targets training "
            "100M+ workers in advanced skills. Context: China faces a dual labor market problem — "
            "youth unemployment (16-24 cohort exceeded 20% in 2023) alongside skills shortages "
            "in advanced manufacturing. Rising vocational enrollment signals the re-skilling "
            "response to automation and industrial upgrading."
        ),
        "related_series": ["aCNCNVSQV", "aCNCNCOQG", "aCNCNTSOE", "aCNCNDHGG"],
    },

    "aCNCNOBSX": {
        "meaning": (
            "Schools and teachers at all levels — ordinary higher education institutions, "
            "Liaoning Province. Annual NBS / MoE education statistic at province level."
        ),
        "how_to_use": (
            "Liaoning is the heart of Northeast China's industrial base (Shenyang, Dalian). "
            "Higher education institution and teacher counts track whether the province can "
            "retain a skilled-education ecosystem despite severe demographic decline (Liaoning "
            "has among the highest out-migration rates and lowest TFRs nationally). University "
            "capacity underpins the Northeast revitalization strategy — decline here signals "
            "structural deterioration of the region's knowledge economy."
        ),
        "related_series": ["aCNCNXQZ", "aCNCNMJBY", "aCNCNCYQI", "aCNCNJLLN"],
    },

    "aCNCNCOQG": {
        "meaning": (
            "Secondary vocational education schools, urban area, Chengde city (Hebei Province). "
            "Annual NBS / MoE education statistic at city level."
        ),
        "how_to_use": (
            "Secondary vocational schools (zhiye xuexiao) are the pipeline for China's "
            "manufacturing and service-sector blue-collar workforce. The government has been "
            "actively expanding vocational education to address skills mismatches. Chengde "
            "(north Hebei) produces workers for Beijing's service sector and Hebei's steel and "
            "cement industries. Track with aCNCNDHGG (Anhui provincial vocational school count) "
            "for national trend verification."
        ),
        "related_series": ["aCNCNTSOE", "aCNCNVKHO", "aCNCNDHGG", "aCNCNYFDM"],
    },

    "aCNCNTSOE": {
        "meaning": (
            "Secondary vocational education schools, urban area, Jilin city (Jilin Province). "
            "Annual NBS / MoE education statistic at city level."
        ),
        "how_to_use": (
            "Jilin city is a major petrochemical and automotive center (FAW Group). Vocational "
            "school count tracks workforce pipeline depth for Northeast China's industrial base. "
            "Decline would signal fiscal pressure, demographic shrinkage, and potential "
            "acceleration of the Northeast industrial hollowing. FAW Group's EV transition "
            "requires new automotive-tech vocational capacity — monitor for curriculum shifts."
        ),
        "related_series": ["aCNCNCOQG", "aCNCNVKHO", "aCNCNDHGG", "aCNCNPRTU"],
    },

    "aCNCNVKHO": {
        "meaning": (
            "Secondary vocational education schools, urban area, Puyang city (Henan Province). "
            "Annual NBS / MoE education statistic at city level."
        ),
        "how_to_use": (
            "Puyang (Henan) is an oil-production city (Zhongyuan Oilfield) transitioning to "
            "petrochemical processing. Vocational school count reflects both demographic trends "
            "in densely populated Henan and the skills pipeline for energy-sector workers. "
            "As China's oil sector restructures and shifts to renewables, vocational curricula "
            "and enrollment will need to adapt — watch for divergence between school counts "
            "and energy-sector employment needs."
        ),
        "related_series": ["aCNCNCOQG", "aCNCNTSOE", "aCNCNDHGG", "aCNCNYFDM"],
    },

    "aCNCNDHGG": {
        "meaning": (
            "Secondary vocational schools, Anhui Province total. Annual NBS / MoE education "
            "statistic at province level."
        ),
        "how_to_use": (
            "Anhui is a major labor-sending province that has undergone rapid industrialization "
            "(BYD EV, Huawei R&D center, semiconductor manufacturing in Hefei). Provincial "
            "vocational school totals track the scale of the blue-collar labor pipeline. "
            "Anhui's dual role as labor exporter and growing advanced manufacturer means "
            "vocational education quality and quantity critically determine whether industrial "
            "upgrading can be sustained locally."
        ),
        "related_series": ["aCNCNCOQG", "aCNCNVKHO", "aCNCNTSOE", "aCNCNPRTU"],
    },

    "aCNCNBHEI": {
        "meaning": (
            "Social service organizations — beds in social welfare adoption units, Dexing city "
            "(Jiangxi Province). Annual NBS / MCA (Ministry of Civil Affairs) social welfare "
            "statistic at city level."
        ),
        "how_to_use": (
            "Social welfare adoption beds measure institutional capacity for orphans and "
            "abandoned children — a historically significant metric in China where the "
            "One-Child Policy drove large numbers of child abandonments (disproportionately "
            "female). Track with aCNPOPF (female population) and aCNCNOUCY. Declining "
            "adoption-unit beds may reflect declining abandonment (positive trend) or funding "
            "cuts. Rising beds in elderly welfare units would signal aging-infrastructure build-out."
        ),
        "related_series": ["aCNCNOUCY", "aCNCNHHRL", "aCNCNRAWA", "aCNPOPF"],
    },

    "aCNCNOUCY": {
        "meaning": (
            "Social service organizations — social welfare adoption units count, Fuyu County "
            "(Songyuan city, Jilin Province). Annual NBS / MCA social welfare statistic at "
            "county level."
        ),
        "how_to_use": (
            "Welfare adoption unit count in rural Jilin tracks provincial social-service "
            "infrastructure depth in a depopulating Northeast province. Fuyu County (ethnic "
            "Mongolian area) has a resource-limited local government. Welfare unit availability "
            "is a direct measure of the safety net for China's most vulnerable — abandoned "
            "children and the elderly poor. Fiscal austerity at local level can cause these "
            "units to close."
        ),
        "related_series": ["aCNCNBHEI", "aCNCNHHRL", "aCNCNRAWA", "aCNPOPT"],
    },

    "aCNCNHHRL": {
        "meaning": (
            "Social service organizations — social welfare adoption units, Puxian County "
            "(Linfen city, Shanxi Province). Annual NBS / MCA social welfare statistic at "
            "county level."
        ),
        "how_to_use": (
            "Puxian (Shanxi) is a coal-mining county. Welfare unit capacity here correlates "
            "with coal-cycle fiscal health — boom periods fund social services; bust periods "
            "trigger cuts. As China's energy transition reduces coal's dominance, Shanxi "
            "counties face long-term fiscal erosion. Use alongside coal price indices and "
            "Shanxi provincial government revenue data."
        ),
        "related_series": ["aCNCNBHEI", "aCNCNOUCY", "aCNCNRAWA", "aCNCNEWKJ"],
    },

    "aCNCNRAWA": {
        "meaning": (
            "Social service organizations — social welfare adoption units, Youxian County "
            "(Zhuzhou city, Hunan Province). Annual NBS / MCA social welfare statistic at "
            "county level."
        ),
        "how_to_use": (
            "Zhuzhou is a major rail equipment and aerospace manufacturing hub; Youxian is its "
            "rural county. Welfare adoption capacity here tracks the social safety net in a "
            "county transitioning between agricultural and industrial economies. Rising capacity "
            "is positive; stagnation signals unmet demographic need as the population ages and "
            "traditional family-care networks weaken."
        ),
        "related_series": ["aCNCNBHEI", "aCNCNHHRL", "aCNCNOUCY", "aCNCNQBHHM"],
    },

    "aCNCNPRTU": {
        "meaning": (
            "Students in secondary vocational schools, Ge'ermu (Golmud) city (Qinghai Province). "
            "Annual NBS education enrollment statistic for a remote resource-city."
        ),
        "how_to_use": (
            "Golmud is a strategic resource hub on the Qinghai-Tibet Plateau (potash, lithium, "
            "oil from the Qaidam Basin). Vocational enrollment here tracks the local skilled-labor "
            "pipeline for the resource and logistics sectors. Lithium's criticality for EV batteries "
            "makes Golmud's workforce development data unexpectedly relevant to the green energy "
            "transition supply chain."
        ),
        "related_series": ["aCNCNCOQG", "aCNCNTSOE", "aCNCNDHGG", "aCNCNYFDM"],
    },

    "aCNCNWXGZM": {
        "meaning": (
            "Number of new hepatitis B cases nationwide. Monthly series published by NHC "
            "(National Health Commission). Tracks notifiable infectious disease incidence."
        ),
        "how_to_use": (
            "China has the world's largest hepatitis B burden (~80M chronic carriers). New case "
            "counts reflect both disease transmission dynamics and screening/reporting rates "
            "(improved testing finds more cases). Hepatitis B is a major driver of liver cancer "
            "and cirrhosis costs in China's healthcare system. Rising case reports can signal "
            "surveillance improvement; sustained high levels indicate ongoing public health "
            "burden with direct implications for pharmaceutical demand (antivirals, vaccines) "
            "and healthcare expenditure."
        ),
        "related_series": ["aCNCNQBHHM", "aCNCNIMXA", "aCNCNCKZV", "aCNPOPT"],
    },

    # ── ENERGY & ENVIRONMENT ──────────────────────────────────────────────

    "aCNCNQIKWP": {
        "meaning": (
            "Inter-provincial mid- and long-term direct electricity trading volume, Liaoning "
            "Province. Monthly series published by SEEC / NEA (National Energy Administration). "
            "Measures contracted electricity volumes traded directly between generators and "
            "large consumers across provincial boundaries."
        ),
        "how_to_use": (
            "Direct electricity trading (DET) is China's market-based power sector reform "
            "mechanism, bypassing regulated utility pricing. Liaoning's inter-provincial DET "
            "volumes reflect Northeast China's surplus hydro and coal power exports to deficit "
            "regions. Rising volumes indicate progress in marketization and grid interconnection. "
            "Pair with thermal/hydro utilization hours (aCNAUHTHRA, aCNAUHHYDA) to assess "
            "supply-demand balance."
        ),
        "related_series": ["aCNCNNFEKP", "aCNCNFUBZP", "aCNAUHTHRA", "aCNAUHHYDA"],
    },

    "aCNCNNFEKP": {
        "meaning": (
            "Inter-provincial mid- and long-term direct electricity trading volume, nationwide "
            "total. Monthly series published by NEA / SEEC. Aggregates all DET volumes across "
            "all provincial grids."
        ),
        "how_to_use": (
            "The national DET aggregate is a leading indicator of China's power market "
            "liberalization progress. The proportion of electricity sold via DET vs regulated "
            "utility tariffs measures how fast China is transitioning to market-based energy "
            "pricing. Rising DET share reduces cross-subsidy distortions and is a prerequisite "
            "for effective carbon pricing through the national ETS. Use with aCNCNXJAZR "
            "(DET ratio to consumption) and aCNCESTCUM (industrial electricity consumption)."
        ),
        "related_series": ["aCNCNQIKWP", "aCNCNFUBZP", "aCNCNXJAZR", "aCNCESTCUM"],
    },

    "aCNCNFUBZP": {
        "meaning": (
            "Inter-provincial mid- and long-term direct electricity trading volume, Xinjiang. "
            "Monthly series published by NEA. Tracks DET volumes for Xinjiang's grid — a major "
            "renewable energy surplus region."
        ),
        "how_to_use": (
            "Xinjiang is China's largest renewable energy base (wind + solar), but its remote "
            "location creates severe curtailment problems. Inter-provincial DET from Xinjiang "
            "to eastern load centers (via ultra-high-voltage transmission lines) directly "
            "measures curtailment reduction. Rising Xinjiang DET exports are bullish for "
            "renewable capacity utilization and the net-zero-by-2060 pathway. Track alongside "
            "Xinjiang wind/solar output and UHV line utilization data."
        ),
        "related_series": ["aCNCNQIKWP", "aCNCNNFEKP", "aCNCNKIMF", "aCNCNIABLM"],
    },

    "aCNCNKZJPR": {
        "meaning": (
            "Mid- and long-term direct electricity trading as a ratio to total consumption, "
            "Henan Province. Monthly series published by NEA. Measures market liberalization "
            "depth in Henan's power sector."
        ),
        "how_to_use": (
            "Henan is a large industrial province and power consumer. The DET ratio shows "
            "what share of Henan's electricity is priced through market mechanisms. A rising "
            "ratio means more industrial consumers face market electricity prices — improving "
            "efficiency signals but also exposing them to price volatility. Critical context "
            "for China's carbon neutrality push: market prices that reflect carbon costs drive "
            "energy efficiency investment."
        ),
        "related_series": ["aCNCNKZFLR", "aCNCNXJAZR", "aCNCNCNQOR", "aCNCESTCUM"],
    },

    "aCNCNKZFLR": {
        "meaning": (
            "Mid- and long-term direct electricity trading ratio to consumption, West Inner "
            "Mongolia Grid. Monthly series published by NEA. Tracks market depth in Inner "
            "Mongolia's western grid — a major coal and wind power hub."
        ),
        "how_to_use": (
            "Inner Mongolia (West Grid) is China's largest coal-power and wind-power province. "
            "The DET ratio here determines whether wind curtailment is being addressed through "
            "market mechanisms or administrative command. High DET ratios + rising wind "
            "utilization hours indicate effective market-based dispatch. Relevant for assessing "
            "China's wind industry economics and carbon emission trajectory."
        ),
        "related_series": ["aCNCNKZJPR", "aCNCNXJAZR", "aCNCNCNQOR", "aCNAUHTHRA"],
    },

    "aCNCNEVNUP": {
        "meaning": (
            "Mid- and long-term direct electricity trading volume, nationwide total (CMLV basis). "
            "Monthly series from NEA. Similar to aCNCNNFEKP but may use a different accounting "
            "basis (cumulative volume less variation)."
        ),
        "how_to_use": (
            "Use alongside aCNCNNFEKP to cross-check national DET volumes and identify "
            "measurement methodology differences. DET volume growth is a key reform KPI — "
            "the government targets full market pricing by 2025-2030. Rising volumes signal "
            "reform progress and reduce the need for costly government price subsidies. "
            "Essential for assessing whether China's power sector is ready for a robust "
            "carbon market."
        ),
        "related_series": ["aCNCNNFEKP", "aCNCNXJAZR", "aCNCNCNQOR", "aCNCESTCUM"],
    },

    "aCNCNXJAZR": {
        "meaning": (
            "Mid- and long-term direct electricity trading as a ratio to total consumption, "
            "nationwide. Monthly series published by NEA. The headline power market "
            "liberalization depth indicator."
        ),
        "how_to_use": (
            "The national DET/consumption ratio is the primary measure of China's electricity "
            "market reform progress. By 2023, this ratio exceeded 60% nationally — a major "
            "milestone. Full marketization is a precondition for effective carbon pricing "
            "(national ETS). A rising ratio also signals more accurate price signals for "
            "investment in renewables vs coal. Cross-reference with carbon credit prices "
            "(national ETS) and coal power generation margins."
        ),
        "related_series": ["aCNCNCNQOR", "aCNCNKZJPR", "aCNCNKZFLR", "aCNCNNFEKP"],
    },

    "aCNCNCNQOR": {
        "meaning": (
            "Mid- and long-term direct electricity trading ratio to consumption, State Grid "
            "Corporation area. Monthly series published by NEA. Covers the State Grid's "
            "service territory (most of China excluding Southern Grid provinces)."
        ),
        "how_to_use": (
            "State Grid controls ~75% of China's grid. The DET ratio within State Grid "
            "territory is the dominant driver of the national ratio. State Grid's progress in "
            "power market reform directly determines the pace of electricity price liberalization "
            "and ultimately carbon neutrality. Use to separate State Grid vs Southern Grid "
            "reform speeds and identify jurisdictional heterogeneity."
        ),
        "related_series": ["aCNCNXJAZR", "aCNCNKZJPR", "aCNCNNFEKP", "aCNCNEVNUP"],
    },

    "aCNCNHMZJP": {
        "meaning": (
            "Provincial mid- and long-term direct electricity trading volume, Guangxi. Monthly "
            "series published by NEA. Tracks DET within Guangxi's provincial grid — a hydro-rich "
            "Southern Grid province."
        ),
        "how_to_use": (
            "Guangxi has significant hydropower capacity (Hongshui River cascade). DET volumes "
            "here reflect intra-provincial market trading between hydro generators and industrial "
            "consumers (aluminium smelters are major Guangxi power consumers). Strong hydro "
            "years flood the market with cheap electricity, boosting DET volumes and benefiting "
            "energy-intensive industry. Pair with Yunnan/Guangxi hydro output and aluminium "
            "production data."
        ),
        "related_series": ["aCNCNYXGMP", "aCNCNSUZHP", "aCNCNKIMF", "aCNAUHHYDA"],
    },

    "aCNCNYXGMP": {
        "meaning": (
            "Provincial mid- and long-term direct electricity trading volume, nationwide "
            "(provincial-level aggregate). Monthly series published by NEA. Sums all intra- "
            "provincial DET volumes across China."
        ),
        "how_to_use": (
            "The provincial DET aggregate complements inter-provincial DET (aCNCNNFEKP) "
            "to give a full picture of China's direct electricity trading market. Intra-provincial "
            "trading liberalization often precedes inter-provincial. High provincial DET volumes "
            "indicate that local generators and consumers are successfully contracting directly — "
            "reducing utility middlemen and improving efficiency."
        ),
        "related_series": ["aCNCNNFEKP", "aCNCNHMZJP", "aCNCNSUZHP", "aCNCNXJAZR"],
    },

    "aCNCNSUZHP": {
        "meaning": (
            "Provincial mid- and long-term direct electricity trading volume, West Inner Mongolia. "
            "Monthly series published by NEA. Measures intra-provincial DET in the resource-rich "
            "western Inner Mongolia grid zone."
        ),
        "how_to_use": (
            "West Inner Mongolia has extraordinary wind and solar resources. Provincial DET "
            "here is the mechanism through which renewable generators sell power directly to "
            "industrial users (data centers, green hydrogen producers, mining operations). "
            "Rising volumes signal progress in integrating variable renewable energy into the "
            "industrial supply chain — a key enabler of China's green hydrogen strategy."
        ),
        "related_series": ["aCNCNKZFLR", "aCNCNYXGMP", "aCNCNHMZJP", "aCNCNFUBZP"],
    },

    "aCNCNKIMF": {
        "meaning": (
            "Power generation capacity, hydropower, Yunnan Province. Annual series from NEA / "
            "NBS. Measures installed hydropower capacity (GW) in Yunnan."
        ),
        "how_to_use": (
            "Yunnan is China's largest hydropower province (Jinsha, Lancang, Nu River cascades). "
            "Installed capacity expansion tracks the pace of China's renewable build-out — "
            "hydro remains the backbone of clean power alongside wind and solar. However, "
            "Yunnan hydro is subject to drought risk: the 2021-22 drought caused severe power "
            "shortages. Pair with precipitation data, reservoir levels, and aCNAUHHYDA "
            "(hydro utilization hours) to assess generation reliability."
        ),
        "related_series": ["aCNAUHHYDA", "aCNCNIABLM", "aCNCNHMZJP", "aCNCNNSVYM"],
    },

    "aCNCNMGVP": {
        "meaning": (
            "City public steam (electric) car standard operation volume. Annual NBS urban "
            "transport statistic measuring the scale of city bus and tram operations (vehicle-km "
            "or equivalent standard operation units)."
        ),
        "how_to_use": (
            "Public transit ridership and capacity are urban mobility indicators tied to "
            "urbanization quality. China has the world's largest urban bus fleet; rapid "
            "electrification (NEV buses) is underway. Rising operation volumes reflect expanding "
            "urban populations and transport infrastructure. Declining volumes may signal "
            "private car competition or post-COVID modal shift. Use with aCNCNQQBR (rural "
            "car ownership) to gauge urban vs rural mobility dynamics."
        ),
        "related_series": ["aCNCNZHYBM", "aCNCNEVEK", "aCNCNGBWH", "aCNCNOUET"],
    },

    "aCNCNJIOM1": {
        "meaning": (
            "Added capacity of 220 kV and above substation equipment, nationwide. Monthly series "
            "published by NEA / State Grid. Measures new high-voltage substation transformer "
            "capacity commissioned in the period."
        ),
        "how_to_use": (
            "Grid infrastructure investment is a leading indicator of China's power sector "
            "capacity expansion. 220kV+ substation additions track the build-out of the "
            "transmission backbone needed to carry renewable energy from western generation "
            "bases to eastern load centers. Acceleration in substation additions precedes "
            "renewable capacity commissioning by 12-18 months. Use as a leading indicator "
            "for renewable energy investment cycles."
        ),
        "related_series": ["aCNCNBFFTM", "aCNCNIABLM", "aCNCNNSVYM", "aCNCNKIMF"],
    },

    "aCNCNBFFTM": {
        "meaning": (
            "Added line length of 220 kV and above transmission lines, nationwide. Monthly "
            "series published by NEA. Measures new high-voltage transmission line "
            "length commissioned."
        ),
        "how_to_use": (
            "Transmission line expansion is the physical infrastructure backbone of China's "
            "energy transition. Long-distance ultra-high-voltage (UHV) DC lines transport "
            "renewable power from Xinjiang, Inner Mongolia, and Yunnan to Beijing, Shanghai, "
            "and Guangdong. Faster line addition correlates with reduced renewable curtailment "
            "and improved grid integration. Pair with aCNCNJIOM1 (substation capacity) for a "
            "comprehensive grid investment picture."
        ),
        "related_series": ["aCNCNJIOM1", "aCNCNFUBZP", "aCNCNKIMF", "aCNCNIABLM"],
    },

    "aCNAUHHYDA": {
        "meaning": (
            "Average utilization hours of power generation equipment, hydraulic (hydropower). "
            "Monthly series published by NEA. Measures capacity utilization of hydropower "
            "plants in hours per year (annualized from monthly data)."
        ),
        "how_to_use": (
            "Hydro utilization hours are a real-time indicator of rainfall and reservoir levels — "
            "China's 'precipitation gauge.' Low hydro utilization forces thermal (coal) backup, "
            "raising coal consumption and emissions. High utilization indicates abundant hydro "
            "and lower carbon intensity of the power grid. The 2021-22 Sichuan/Yunnan drought "
            "drove hydro utilization to multi-year lows, causing manufacturing shutdowns and "
            "power rationing. Pair with rainfall anomalies and La Nina/El Nino cycle data."
        ),
        "related_series": ["aCNAUHTHRA", "aCNCNKIMF", "aCNCNIABLM", "aCNCESTCUM"],
    },

    "aCNAUHTHRA": {
        "meaning": (
            "Average utilization hours of power generation equipment, thermal (coal + gas + oil). "
            "Monthly series published by NEA. The headline coal-power capacity utilization "
            "indicator."
        ),
        "how_to_use": (
            "Thermal utilization hours are the key coal demand and industrial activity gauge. "
            "Rising hours signal strong power demand growth (industrial expansion) and/or "
            "renewable shortfalls requiring coal backup. Declining hours indicate either demand "
            "weakness or renewable displacement of coal — the latter is the net-zero signal. "
            "Target for carbon neutrality: thermal utilization hours declining alongside rising "
            "renewable hours. Cross-reference with aCNCESTCUM (secondary industry electricity "
            "consumption) and coal production data."
        ),
        "related_series": ["aCNAUHHYDA", "aCNCESTCUM", "aCNCNNSVYM", "aCNCNIABLM"],
    },

    "aCNCESTCUM": {
        "meaning": (
            "Electricity consumption, secondary industry (manufacturing + construction + mining). "
            "Monthly series published by NEA. The most reliable real-time proxy for industrial "
            "activity in China."
        ),
        "how_to_use": (
            "Secondary-industry electricity consumption is one of the 'Li Keqiang Index' "
            "inputs — historically more reliable than GDP for gauging true industrial activity. "
            "Year-over-year growth correlates tightly with PMI manufacturing output sub-index "
            "and industrial value-added. Deceleration signals industrial slowdown (property "
            "crisis impact on steel/cement); acceleration signals restocking cycles. Critical "
            "for cross-checking official GDP data credibility."
        ),
        "related_series": ["aCNAUHTHRA", "aCNAUHHYDA", "aCNCNNFEKP", "aCNCNXJAZR"],
    },

    "aCNCNIABLM": {
        "meaning": (
            "New production capacity — power generation, hydropower. Monthly series published "
            "by NEA. Measures newly commissioned hydropower capacity (GW) during the period."
        ),
        "how_to_use": (
            "Newly added hydro capacity is a pipeline-to-operating indicator for China's "
            "clean energy build-out. Hydro additions are lumpy (large dam projects take "
            "10+ years to build). Key projects: Baihetan (16 GW, fully commissioned 2022), "
            "Wudongde. Future mega-projects on the Nu River and lower Jinsha are in planning. "
            "Pair with aCNCNKIMF (Yunnan capacity) and aCNAUHHYDA (utilization) to track "
            "hydro's net-zero contribution."
        ),
        "related_series": ["aCNCNNSVYM", "aCNCNKIMF", "aCNAUHHYDA", "aCNCNJIOM1"],
    },

    "aCNCNNSVYM": {
        "meaning": (
            "New production capacity — power generation, thermal power. Monthly series published "
            "by NEA. Measures newly commissioned thermal (coal + gas) generation capacity (GW)."
        ),
        "how_to_use": (
            "China continues to commission new coal-fired power plants (as 'flexibility reserves' "
            "to back up intermittent renewables) even as it leads the world in renewable build-out. "
            "New thermal additions signal the pace of coal lock-in vs transition. Post-2021 power "
            "shortages triggered a surge in new coal approvals. Watch for divergence: thermal "
            "additions rising while utilization falls — indicating overcapacity and stranded "
            "asset risk in the coal-power fleet."
        ),
        "related_series": ["aCNCNIABLM", "aCNAUHTHRA", "aCNCNKIMF", "aCNCNBFFTM"],
    },

    "aCNCNRUNM": {
        "meaning": (
            "Bauxite base reserves, nationwide. Frequency not specified (likely annual or "
            "periodic). Published by MNR (Ministry of Natural Resources). Measures China's "
            "proven bauxite mineral reserve base."
        ),
        "how_to_use": (
            "Bauxite is the primary raw material for aluminium — a critical industrial metal "
            "for EVs, aerospace, and construction. China has limited domestic bauxite reserves "
            "relative to its consumption and relies heavily on imports (Guinea, Australia). "
            "Reserve data informs energy security and supply-chain resilience strategy. "
            "Changes in reserve estimates reflect new exploration, reclassification, and "
            "depletion. Use with aluminium production and import data."
        ),
        "related_series": ["aCNCNKOOO", "aCNCNOHEG", "aCNT2SPSRNF", "aCNCNLZVJ"],
    },

    "aCNCNLZVJ": {
        "meaning": (
            "Diesel consumption (physical quantity) — railway, marine, aerospace, and other "
            "transportation equipment. Annual NBS energy balance statistic for the transport "
            "fuel sub-sector."
        ),
        "how_to_use": (
            "Transport-sector diesel consumption is a proxy for freight activity and "
            "logistics intensity. China is electrifying its rail network (high-speed rail "
            "and heavy-freight rail electrification) but marine and aviation remain heavily "
            "fossil-fuel dependent. Declining diesel in rail tracks electrification progress; "
            "marine diesel trends reflect export shipping volumes. Cross-reference with "
            "export growth and freight ton-km data."
        ),
        "related_series": ["aCNNGSACTP", "aCNCNMGVP", "aCNCESTCUM", "aCNCNQBJS"],
    },

    "aCNCNQBJS": {
        "meaning": (
            "Domestic gas supply of municipal LPG (liquefied petroleum gas), Weinan city "
            "(Shaanxi Province). Annual NBS urban gas supply statistic at city level."
        ),
        "how_to_use": (
            "Municipal LPG supply tracks residential energy use in a mid-tier Shaanxi city. "
            "Weinan's LPG data is interesting given Shaanxi's proximity to the Ordos Basin "
            "natural gas fields — LPG is the incumbent residential fuel where pipeline gas "
            "has not yet reached. Declining LPG + rising pipeline natural gas (aCNCNNIRY) "
            "signals the coal/LPG-to-gas switching transition in city-level distribution."
        ),
        "related_series": ["aCNCNNIRY", "aCNNGSACTP", "aCNNGSACCR", "aCNCNLZVJ"],
    },

    "aCNCNNIRY": {
        "meaning": (
            "Domestic gas supply of municipal LPG, Zaozhuang city (Shandong Province). Annual "
            "NBS urban gas supply statistic at city level."
        ),
        "how_to_use": (
            "Zaozhuang (Shandong) is a former coal-mining city in transition. LPG supply data "
            "here contrasts with broader natural gas (pipeline and LNG) penetration into "
            "Shandong's city gas networks. Shandong is China's largest province by many "
            "industrial metrics and a key test case for the 'coal-to-gas' residential heating "
            "switch. Cross-reference with aCNNGSACTP for national gas demand context."
        ),
        "related_series": ["aCNCNQBJS", "aCNNGSACTP", "aCNNGSACCP", "aCNNGSACCR"],
    },

    "aCNCNKOOO": {
        "meaning": (
            "Kaolin foundation reserves, Shaanxi Province. Frequency not specified (likely "
            "annual or periodic). Published by MNR. Measures proven kaolin (china clay) "
            "mineral reserves."
        ),
        "how_to_use": (
            "Kaolin is used in paper coating, ceramics, and increasingly as a precursor for "
            "advanced materials (alumina, zeolites). Shaanxi's kaolin reserves contribute to "
            "China's ceramics and materials industry supply chain. Reserve changes track "
            "exploration activity and resource depletion rates. Use as a supply-side indicator "
            "for the domestic ceramics and advanced materials sectors."
        ),
        "related_series": ["aCNCNRUNM", "aCNCNOHEG", "aCNCNNUKD", "aCNCNGBWH"],
    },

    "aCNCNNUKD": {
        "meaning": (
            "Land area, Dongzhi County (Chizhou city, Anhui Province). Annual NBS geographic "
            "statistic at county level measuring total administrative land area."
        ),
        "how_to_use": (
            "Land area data establishes the geographic denominator for per-capita and per-km2 "
            "calculations (population density, road density, economic output per km2). Dongzhi "
            "(Anhui) is in the Yangtze Economic Belt zone; land-use efficiency metrics are "
            "relevant to industrial park development and rural land reform policies."
        ),
        "related_series": ["aCNCNGBWH", "aCNCNMVSC", "aCNCNKFCR", "aCNCNEVEK"],
    },

    "aCNCNGBWH": {
        "meaning": (
            "Land area, Jining District (Wulanchabu city, Inner Mongolia). Annual NBS geographic "
            "statistic at district level."
        ),
        "how_to_use": (
            "Jining District is the seat of Wulanchabu — a city on the Beijing-Hohhot axis "
            "with growing data-center clusters (low-cost power + cool climate). Land area "
            "provides the baseline for economic density calculations. Inner Mongolia's "
            "development model of land-intensive resource extraction transitioning to "
            "data-intensive services is visible in spatial economic data."
        ),
        "related_series": ["aCNCNNUKD", "aCNCNMVSC", "aCNCNOAWM", "aCNCNNMVM"],
    },

    "aCNCNMVSC": {
        "meaning": (
            "Land area, Qujiang District (Shaoguan city, Guangdong Province). Annual NBS "
            "geographic statistic at district level."
        ),
        "how_to_use": (
            "Qujiang District sits in northern Guangdong near the Nanling Mountains. Land "
            "area data here is primarily useful for per-capita economic calculations. Guangdong's "
            "spatial economy is highly uneven — the Pearl River Delta accounts for 80%+ of "
            "provincial GDP on a fraction of the land. Northern Guangdong districts like "
            "Qujiang represent the province's rural-development challenge."
        ),
        "related_series": ["aCNCNNUKD", "aCNCNGBWH", "aCNCNKFCR", "aCNCNFLCP"],
    },

    "aCNCNKFCR": {
        "meaning": (
            "Nature reserve area, Shandong Province. Annual NBS / MEE (Ministry of Ecology "
            "and Environment) environmental statistic measuring total protected area (km2)."
        ),
        "how_to_use": (
            "Protected area expansion is a key metric for China's Ecological Civilization "
            "goals and its commitments under the Kunming-Montreal Global Biodiversity Framework "
            "(target: 30% of land and sea under protection by 2030). Shandong's nature reserve "
            "data tracks whether industrial growth is balanced with environmental conservation. "
            "Rising protected areas can restrict mining and industrial development in some zones."
        ),
        "related_series": ["aCNCNGETJ", "aCNCNHTOY", "aCNCNNUKD", "aCNCNEVEK"],
    },

    "aCNCNHTOY": {
        "meaning": (
            "Number of people affected by natural disasters, Chongqing Municipality. Annual "
            "NBS / Ministry of Emergency Management statistic measuring disaster-affected "
            "population."
        ),
        "how_to_use": (
            "Chongqing is highly prone to flooding (Yangtze River) and geological hazards "
            "(landslides). Rising affected-population counts signal climate-change intensification "
            "of extreme weather — a direct fiscal cost (disaster relief, infrastructure repair) "
            "and longer-term migration catalyst. Climate adaptation spending is an increasingly "
            "important component of China's fiscal policy."
        ),
        "related_series": ["aCNCNKFCR", "aCNCNNMVM", "aCNCNEVEK", "aCNCNNOAU"],
    },

    "aCNCNNMVM": {
        "meaning": (
            "Number of towns (zhen), Santai County (Mianyang city, Sichuan Province). Annual "
            "NBS administrative geography statistic at county level."
        ),
        "how_to_use": (
            "Town (zhen) count changes reflect the pace of administrative reclassification "
            "from rural villages to urbanized towns — a dimension of China's urbanization "
            "measurement. Rapid increases in town counts can artificially inflate urbanization "
            "rates (the 'urbanization by reclassification' phenomenon). Useful for methodological "
            "cross-checking of official urbanization statistics."
        ),
        "related_series": ["aCNCNGBWH", "aCNCNFLCP", "aCNCNOAWM", "aCNPOPT"],
    },

    "aCNCNOHEG": {
        "meaning": (
            "Pyrite base reserves, Sichuan Province. Frequency not specified (likely annual). "
            "Published by MNR. Measures proven pyrite (iron sulfide) mineral reserves used "
            "in sulfuric acid production."
        ),
        "how_to_use": (
            "Pyrite is the main feedstock for China's sulfuric acid industry, which supplies "
            "phosphate fertilizer production. Sichuan's pyrite reserves underpin fertilizer "
            "supply security — critical for food security in a country importing modest but "
            "growing amounts of food. Reserve depletion could raise sulfuric acid production "
            "costs and fertilizer prices domestically."
        ),
        "related_series": ["aCNCNRUNM", "aCNCNKOOO", "aCNCNNUKD", "aCNCNGBWH"],
    },

    "aCNCNEVEK": {
        "meaning": (
            "Road area per capita, county-level cities. Annual NBS urban infrastructure "
            "statistic measuring paved road surface per resident (m2/person)."
        ),
        "how_to_use": (
            "Road area per capita is a quality-of-urban-infrastructure indicator for county-level "
            "cities — China's third-tier administrative layer where the bulk of infrastructure "
            "investment was concentrated during 2000-2020. Rising road area per capita reflects "
            "urbanization infrastructure build-out; very high levels may indicate over-investment "
            "relative to population (ghost-city risk). Pair with population density (aCNCNFLCP) "
            "and economic output data."
        ),
        "related_series": ["aCNCNMGVP", "aCNCNNMVM", "aCNCNGBWH", "aCNCNOUET"],
    },

    "aCNCNCCDK": {
        "meaning": (
            "Street offices (jiedao banshichu), Boli County (Qitaihe city, Heilongjiang Province). "
            "Annual NBS administrative geography statistic counting urban sub-district offices."
        ),
        "how_to_use": (
            "Street office counts track sub-district administrative granularity — a proxy for "
            "urbanization pace and governance capacity in former industrial cities. Boli County "
            "(Heilongjiang coal area) has been depopulating; declining street office counts "
            "signal administrative consolidation following population loss. Use as a governance "
            "indicator for resource-dependent northeast cities under restructuring."
        ),
        "related_series": ["aCNCNBFGM", "aCNCNNMVM", "aCNCNGBWH", "aCNCNOAWM"],
    },

    "aCNCNBFGM": {
        "meaning": (
            "Street offices, Guoyang County (Bozhou city, Anhui Province). Annual NBS "
            "administrative geography statistic."
        ),
        "how_to_use": (
            "Guoyang (Anhui) is a major coal-producing county. Street office count changes "
            "track urban administrative footprint expansion. Bozhou Prefecture is noted for "
            "traditional Chinese medicine (herb market). Administrative geography data provides "
            "context for local government capacity and service delivery in transition economies."
        ),
        "related_series": ["aCNCNCCDK", "aCNCNNMVM", "aCNCNDHGG", "aCNCNEWKJ"],
    },

    "aCNCNDNV1": {
        "meaning": (
            "Total public libraries, urban area, Weifang city (Shandong Province). Annual "
            "NBS cultural infrastructure statistic at city level."
        ),
        "how_to_use": (
            "Public library count is a proxy for cultural infrastructure investment and literacy "
            "support — part of China's 'cultural confidence' and social-modernization agenda. "
            "Weifang is a mid-sized Shandong manufacturing city (kites, chemical industry). "
            "Library expansion here reflects local government spending priorities and the "
            "government's push to improve cultural access in non-first-tier cities."
        ),
        "related_series": ["aCNCNGETJ", "aCNCNEVEK", "aCNCNSYYO", "aCNCNVKHO"],
    },

    "aCNCNNOAU": {
        "meaning": (
            "Total urban water supply, Huaibei City (Anhui Province). Frequency not specified "
            "(likely annual). NBS urban utilities statistic measuring water supply volume "
            "to urban residents and industry."
        ),
        "how_to_use": (
            "Urban water supply is an infrastructure utilization indicator combining population "
            "served and per-capita consumption. Huaibei is a coal city in northern Anhui facing "
            "water scarcity (North China plain water stress). Declining supply may signal "
            "conservation success or economic/population contraction. Rising supply tracks "
            "urbanization and industrial growth. Cross-reference with South-to-North Water "
            "Diversion project delivery volumes."
        ),
        "related_series": ["aCNCNOUET", "aCNCNGETJ", "aCNCNHTOY", "aCNCNEVEK"],
    },

    "aCNCNOUET": {
        "meaning": (
            "Urban drainage pipe length, Fuzhou city (Fujian Province). Annual NBS urban "
            "infrastructure statistic measuring total drainage network length (km)."
        ),
        "how_to_use": (
            "Drainage infrastructure is a climate adaptation investment indicator. Fuzhou "
            "(Fujian coast) is highly exposed to typhoons and urban flooding. Expanding "
            "drainage networks reduce flood damage — a direct resilience investment. "
            "China's 'sponge city' program (urban water management) targets drainage "
            "capacity upgrades in flood-prone coastal cities. Use with aCNCNHTOY for "
            "disaster risk vs infrastructure investment comparison."
        ),
        "related_series": ["aCNCNNOAU", "aCNCNGETJ", "aCNCNEVEK", "aCNCNHTOY"],
    },

    "aCNNGSACTP": {
        "meaning": (
            "Natural gas apparent consumption, monthly total. Published by NBS / NEA. "
            "Calculated as: production + net imports - stock change. The headline domestic "
            "natural gas demand indicator."
        ),
        "how_to_use": (
            "Natural gas is China's fastest-growing fossil fuel and the key transition fuel "
            "in the path to carbon neutrality. Apparent consumption growth ~10-15% YoY "
            "pre-pandemic reflects: (1) coal-to-gas switching in power generation and heating, "
            "(2) industrial feedstock demand, (3) city gas residential growth. China is the "
            "world's largest LNG importer (alongside Japan). Pair with LNG import prices, "
            "Russian pipeline gas volumes, and aCNNGSACCR (YoY growth rate) for demand trend "
            "analysis."
        ),
        "related_series": ["aCNNGSACTR", "aCNNGSACCP", "aCNNGSACCR", "aCNCNQBJS"],
    },

    "aCNNGSACTR": {
        "meaning": (
            "Natural gas apparent consumption, year-over-year change (%). Monthly series "
            "from NBS / NEA. The growth rate of natural gas demand."
        ),
        "how_to_use": (
            "The YoY growth rate cuts seasonal noise from the level series and directly "
            "measures demand acceleration/deceleration. Growth exceeding 10% signals strong "
            "coal-to-gas switching and industrial demand; near-zero or negative growth "
            "(as in 2022 COVID lockdowns) signals demand destruction. This series feeds "
            "directly into global LNG spot price forecasts — China's demand swings are the "
            "biggest marginal driver of global LNG markets."
        ),
        "related_series": ["aCNNGSACTP", "aCNNGSACCP", "aCNNGSACCR", "aCNCNNIRY"],
    },

    "aCNNGSACCP": {
        "meaning": (
            "Natural gas apparent consumption, cumulative year-to-date. Monthly series from "
            "NBS / NEA. Running total from January of each year."
        ),
        "how_to_use": (
            "Cumulative consumption smooths monthly volatility and enables full-year demand "
            "forecasting. By mid-year, the cumulative series provides reliable annualized "
            "demand projections that LNG traders and pipeline operators use for forward "
            "planning. Compare current-year cumulative with prior-year to gauge annual "
            "demand trajectory. Pair with aCNNGSACCR (cumulative YoY growth) for "
            "trend-in-trend analysis."
        ),
        "related_series": ["aCNNGSACTP", "aCNNGSACTR", "aCNNGSACCR", "aCNCNQBJS"],
    },

    "aCNNGSACCR": {
        "meaning": (
            "Natural gas apparent consumption, cumulative year-to-date, year-over-year change (%). "
            "Monthly series from NBS / NEA. Cumulative growth rate."
        ),
        "how_to_use": (
            "The cumulative YoY growth rate is the cleanest single indicator of China's "
            "annual gas demand trajectory. It removes month-to-month volatility (weather, "
            "maintenance cycles) and provides a stable signal for full-year demand. A key "
            "input for LNG contract negotiations and for assessing China's progress on its "
            "natural gas share target (>10% of primary energy mix by 2030, vs ~8% currently). "
            "Track with LNG spot price (JKM) for market impact analysis."
        ),
        "related_series": ["aCNNGSACTP", "aCNNGSACTR", "aCNNGSACCP", "aCNCNNIRY"],
    },

    "aCNCNMNBAM": {
        "meaning": (
            "International reserves, China. Monthly series from SAFE (State Administration "
            "of Foreign Exchange) / PBoC. Measures total official reserve assets (USD bn) "
            "including foreign currency, gold, IMF SDRs, and reserve position."
        ),
        "how_to_use": (
            "China holds the world's largest foreign exchange reserves (~$3.2T as of 2024). "
            "Reserve levels are a key macro-stability anchor: they back the CNY peg corridor, "
            "fund PBOC FX intervention, and underpin China's external creditor position. "
            "Monthly changes reflect: (1) valuation effects (USD/EUR/gold price moves), "
            "(2) net intervention, (3) interest income. Declining reserves signal capital "
            "outflow pressure or intervention to defend CNY. Cross-reference with BoP "
            "financial account and CNY spot rate."
        ),
        "related_series": ["aCNNGSACTP", "aCNCNQIKWP", "aCNCNNFEKP", "aCNCESTCUM"],
    },

    # ── SALES / ORDERS / INVENTORIES ──────────────────────────────────────

    "aCNCNYUFM1": {
        "meaning": (
            "Import value via processing trade centers (bonded zones/processing centers). "
            "Monthly series from GACC (General Administration of Customs). Tracks imports "
            "channeled through China's processing trade regime."
        ),
        "how_to_use": (
            "Processing trade imports (materials imported for assembly/re-export) are a "
            "key structural component of China's trade. Their share of total imports has "
            "declined as China moves up the value chain (from ~50% in the 1990s to ~20% now). "
            "Falling processing trade imports signal structural transformation — fewer "
            "low-value assembly operations. Rising processing trade can indicate export order "
            "recovery. Cross-reference with total exports and manufacturing PMI new export "
            "orders."
        ),
        "related_series": ["aCNT2SPSRCW", "aCNT2SPSRFM", "aCNT2SPSRNF", "aCNCNZHYBM"],
    },

    "aCNCNOZFOM": {
        "meaning": (
            "Foreign property insurance company original insurance premium income — French Union "
            "Insurance. Monthly series from CBIRC (China Banking and Insurance Regulatory "
            "Commission). Tracks premium revenue of a foreign-invested property insurer."
        ),
        "how_to_use": (
            "Premium income from foreign insurers in China tracks the penetration and growth "
            "of foreign financial services in a highly regulated, gradually liberalizing market. "
            "China's property insurance market is dominated by PICC, Ping An, and China Life "
            "P&C; foreign players have <5% market share. French Union premium trends reflect "
            "appetite for specialty risks (marine, aviation, trade credit) where foreign "
            "expertise has a competitive edge."
        ),
        "related_series": ["aCNCNURXM1", "aCNCNTOJUM", "aCNCNOOTHM", "aCNCNRBUM"],
    },

    "aCNCNURXM1": {
        "meaning": (
            "Foreign property insurance company original premium income — Fubon Property "
            "Insurance (Taiwan-invested insurer in mainland China). Monthly series from CBIRC."
        ),
        "how_to_use": (
            "Fubon Property's premium income in mainland China tracks cross-strait financial "
            "services integration. Taiwan-invested insurers serve both the Taiwanese corporate "
            "community in China (manufacturing supply chains) and domestic Chinese clients. "
            "Fubon's growth reflects the Taiwan investment presence in China and cross-strait "
            "economic linkages — sensitive to bilateral political developments."
        ),
        "related_series": ["aCNCNOZFOM", "aCNCNTOJUM", "aCNCNOOTHM", "aCNCNRBUM"],
    },

    "aCNCNTOJUM": {
        "meaning": (
            "Foreign property insurance company original premium income — History Property "
            "Insurance. Monthly series from CBIRC."
        ),
        "how_to_use": (
            "A smaller foreign-invested property insurer's premium income. Use in aggregate "
            "with other foreign insurer series (aCNCNOZFOM, aCNCNRBUM) to construct a "
            "composite foreign property insurance market share indicator. The aggregate "
            "trend of foreign insurer premiums captures the pace of financial market opening "
            "under CBIRC's licensing regime and reflects foreign corporate demand for "
            "non-life insurance coverage in China."
        ),
        "related_series": ["aCNCNOZFOM", "aCNCNURXM1", "aCNCNOOTHM", "aCNCNGWFJ"],
    },

    "aCNCNOOTHM": {
        "meaning": (
            "Foreign property insurance company original premium income — Meiya Insurance. "
            "Monthly series from CBIRC."
        ),
        "how_to_use": (
            "Meiya Insurance (美亚财险 AIG-affiliated) is one of the largest foreign property "
            "insurers in China. Its premium income is a bellwether for foreign insurer "
            "performance. AIG has a long history in China (pre-1949 roots); Meiya's growth "
            "tracks the expansion of international trade, expatriate services, and liability "
            "insurance in China. Declining premiums may signal foreign corporate retreat or "
            "market competition from domestic players."
        ),
        "related_series": ["aCNCNOZFOM", "aCNCNURXM1", "aCNCNRBUM", "aCNCNGWFJ"],
    },

    "aCNCNRBUM": {
        "meaning": (
            "Foreign property insurance company original premium income — Sumitomo Mitsui "
            "Marine Fire Insurance (Japan). Monthly series from CBIRC."
        ),
        "how_to_use": (
            "Japan is China's largest foreign investor by historical stock. Sumitomo Mitsui "
            "Marine's China premium income tracks Japanese corporate presence and risk appetite "
            "in China — including manufacturing supply-chain insurance. Sharp declines could "
            "signal Japanese corporate withdrawal from China (de-risking). Use alongside "
            "Japan FDI into China data and bilateral trade volumes."
        ),
        "related_series": ["aCNCNOOTHM", "aCNCNURXM1", "aCNCNOZFOM", "aCNCNTOJUM"],
    },

    "aCNCNCKYLQ": {
        "meaning": (
            "Insurance companies — enterprise annuity investment management business "
            "contribution amount, Safe Pension (太平养老). Quarterly series from CBIRC / "
            "Ministry of Human Resources and Social Security (MoHRSS). Measures employer "
            "contributions managed by Safe Pension."
        ),
        "how_to_use": (
            "Enterprise annuities (second-pillar pensions) are underdeveloped in China — "
            "covering only ~30M workers vs the ~700M+ formal-sector workforce. Contribution "
            "volumes track the growth of supplementary pension savings, critical given "
            "China's aging demographic and the first-pillar public pension's fiscal pressures "
            "(projected deficit by 2035). Rising contributions signal corporate willingness "
            "to invest in employee retention and pension security."
        ),
        "related_series": ["aCNCNNMMPQ", "aCNCNRZXGQ", "aCNCNQBHHM", "aCNPOPT"],
    },

    "aCNCNNMMPQ": {
        "meaning": (
            "Insurance companies — enterprise annuity investment management business "
            "contribution amount, Yangtze River Pension (长江养老). Quarterly series from "
            "CBIRC / MoHRSS."
        ),
        "how_to_use": (
            "Yangtze River Pension is a major enterprise annuity manager. Contribution "
            "growth here tracks pension savings accumulation in the Yangtze River Economic "
            "Belt — China's most populous economic corridor. Aggregate enterprise annuity "
            "contributions (aCNCNCKYLQ + aCNCNNMMPQ + aCNCNRZXGQ) give a read on China's "
            "pension savings adequacy vs the looming elderly care funding gap."
        ),
        "related_series": ["aCNCNCKYLQ", "aCNCNRZXGQ", "aCNCNQBHHM", "aCNCNBHEI"],
    },

    "aCNCNDQNI": {
        "meaning": (
            "Insurance companies — total liabilities, Anbang Assets Management. Frequency "
            "not specified (likely annual). From CBIRC. Measures the liability side of "
            "Anbang's insurance/asset management balance sheet."
        ),
        "how_to_use": (
            "Anbang Insurance was seized by the government in 2018 following its aggressive "
            "global acquisition spree and domestic mis-selling of high-yield wealth management "
            "products. Its liability data tracks the resolution of one of China's most "
            "prominent insurance sector bailouts. Rising liabilities post-seizure would "
            "signal ongoing policy cost; declining liabilities reflect successful wind-down. "
            "Relevant for assessing systemic risk management in China's insurance sector."
        ),
        "related_series": ["aCNCNKJBP", "aCNCNPDZM", "aCNCNOZFOM", "aCNCNGWFJ"],
    },

    "aCNCNRZXGQ": {
        "meaning": (
            "Insurance companies — pension security and other entrusted management assets "
            "balance, National Life Pension (国寿养老). Quarterly series from CBIRC / MoHRSS. "
            "Measures AUM of China Life's pension management arm."
        ),
        "how_to_use": (
            "National Life Pension (China Life subsidiary) is the largest enterprise annuity "
            "manager. Its AUM balance tracks the accumulation of second-pillar pension assets — "
            "a critical buffer for China's aging demographics. Rising AUM is positive for "
            "institutional equity and bond market demand (pension managers are long-term "
            "investors). China's pension fund AUM is still small relative to GDP vs developed "
            "markets — significant growth runway."
        ),
        "related_series": ["aCNCNCKYLQ", "aCNCNNMMPQ", "aCNCNQBHHM", "aCNPOPT"],
    },

    "aCNCNPDZM": {
        "meaning": (
            "Insurance net profit — Junkang Life Insurance Co., Ltd. Annual series from "
            "CBIRC. Measures bottom-line profitability of Junkang Life."
        ),
        "how_to_use": (
            "Insurance sector profitability is a financial cycle indicator. China's life "
            "insurers face dual pressures: low interest rates compress investment returns "
            "on policy reserves, while claim costs rise with aging. Junkang Life (a smaller "
            "insurer) net profit tracks whether sector-wide margin pressures are affecting "
            "smaller players disproportionately. Sector-wide insurance profits also track "
            "investment portfolio returns (equities, bonds, real estate)."
        ),
        "related_series": ["aCNCNKJBP", "aCNCNKPYC", "aCNCNDQNI", "aCNCNGWFJ"],
    },

    "aCNCNKJBP": {
        "meaning": (
            "Insurance net profit — Sunshine Property Insurance Co. Annual series from CBIRC. "
            "Measures net profit of a mid-sized domestic property-casualty insurer."
        ),
        "how_to_use": (
            "Sunshine P&C profit is a corporate earnings proxy for China's non-life insurance "
            "cycle. P&C profitability depends on: combined ratios (claims + expenses vs "
            "premiums), catastrophe losses (floods, typhoons — rising with climate change), "
            "and investment returns. Use with premium income data and catastrophe loss "
            "statistics to construct a full-cycle insurance sector picture."
        ),
        "related_series": ["aCNCNPDZM", "aCNCNGWFJ", "aCNCNOOTHM", "aCNCNRBUM"],
    },

    "aCNCNKPYC": {
        "meaning": (
            "Personal insurance companies — original insurance premium income, China Merchants "
            "Cigna Life Insurance Co., Ltd. Annual series from CBIRC."
        ),
        "how_to_use": (
            "China Merchants Cigna is a sino-foreign JV life insurer (China Merchants Bank + "
            "Cigna). Its premium income tracks: (1) bancassurance channel productivity (CMBCM "
            "branch network), (2) demand for health and life insurance in an aging society, "
            "(3) foreign insurer strategy success in China. China's health insurance market "
            "is the fastest-growing globally; Cigna's China JV premium growth is a bellwether "
            "for foreign health insurer opportunity."
        ),
        "related_series": ["aCNCNPDZM", "aCNCNKJBP", "aCNCNQBHHM", "aCNCNCKYLQ"],
    },

    "aCNCNQBHHM": {
        "meaning": (
            "Basic medical insurance participation (人数). Monthly series from NHC / NBS. "
            "Measures total enrollment in China's basic medical insurance schemes (urban "
            "employee BMI + urban-rural resident BMI)."
        ),
        "how_to_use": (
            "Basic medical insurance enrollment is the coverage indicator for China's universal "
            "healthcare system. China achieved near-universal coverage (~1.36B enrollees) by "
            "2015 through the urban-rural resident scheme expansion. Monthly changes reflect: "
            "demographic shifts (population decline reduces absolute enrollment), migrant "
            "worker enrollment improvements (hukou reform), and administrative consolidation. "
            "Coverage quality (not just quantity) is the policy frontier; pair with per-capita "
            "reimbursement rate data."
        ),
        "related_series": ["aCNCNBHEI", "aCNCNKPYC", "aCNCNRZXGQ", "aCNPOPT"],
    },

    "aCNCNSTLAR": {
        "meaning": (
            "Enterprise profits, industrial enterprises, year-over-year change (%). Monthly "
            "series from NBS. Covers all industrial enterprises with annual revenue above "
            "CNY 20M."
        ),
        "how_to_use": (
            "Industrial enterprise profits are China's corporate earnings cycle indicator — "
            "the equivalent of an S&P 500 earnings growth rate for the industrial sector. "
            "The series leads equity market sentiment by 2-3 months. Structural context: "
            "profit growth has been compressed by deflation (negative PPI since October 2022), "
            "weak demand, and price wars in EVs and solar. Deep negative readings correlate "
            "with equity market corrections; recovery signals the trough of the industrial "
            "cycle."
        ),
        "related_series": ["aCNPFYAR", "aCNINVPNG", "aCNINVPNF", "aCNT2SPSRCW"],
    },

    "aCNPFYAR": {
        "meaning": (
            "Industrial total profits, cumulative year-to-date, year-over-year change (%). "
            "Monthly series from NBS. Cumulative growth rate of industrial profits."
        ),
        "how_to_use": (
            "The cumulative YoY growth rate of industrial profits smooths base-effect "
            "volatility in the monthly series. It is the key input for full-year corporate "
            "earnings forecasting. A cumulative rate recovering from deep negatives (as in "
            "2023) signals the beginning of an earnings cycle upturn. The PPI deflation "
            "context is crucial: nominal profit growth understates real profit recovery "
            "if prices are falling. Decompose into revenue growth vs margin recovery."
        ),
        "related_series": ["aCNCNSTLAR", "aCNINVPNG", "aCNINVPNF", "aCNT2SPSRNF"],
    },

    "aCNINVPNG": {
        "meaning": (
            "Inventories, finished goods — petroleum and natural gas extraction sector. "
            "Monthly series from NBS industrial enterprise survey."
        ),
        "how_to_use": (
            "Oil and gas sector finished goods inventories track the supply-demand balance "
            "in China's upstream energy industry. Rising inventories signal production "
            "outpacing refinery offtake (potential crude price pressure domestically) or "
            "export restrictions. Declining inventories indicate strong refinery throughput. "
            "Pair with crude oil import data and refinery utilization rates for a full "
            "picture of China's oil supply chain."
        ),
        "related_series": ["aCNINVPNF", "aCNNGSACTP", "aCNCNSTLAR", "aCNT2SPSRCW"],
    },

    "aCNINVPNF": {
        "meaning": (
            "Inventories, finished goods — petroleum processing, coking, and nuclear fuels "
            "processing sector. Monthly series from NBS industrial enterprise survey."
        ),
        "how_to_use": (
            "Refined petroleum product inventories (gasoline, diesel, jet fuel, coke) are "
            "critical demand-supply indicators. High coke inventories signal steel sector "
            "slowdown (property crisis impact); high diesel inventories signal logistics "
            "and construction weakness. Gasoline inventory swings reflect passenger vehicle "
            "demand and EV substitution (rising EV penetration structurally reduces gasoline "
            "demand). Use with aCNCNLZVJ (transport diesel) for cross-sector verification."
        ),
        "related_series": ["aCNINVPNG", "aCNCNLZVJ", "aCNNGSACTP", "aCNT2SPSRCW"],
    },

    "aCNCNROGS": {
        "meaning": (
            "Online retail trade, total transaction value. Annual series from NBS / MOFCOM "
            "(Ministry of Commerce). Measures total e-commerce retail sales value."
        ),
        "how_to_use": (
            "China has the world's largest e-commerce market (~$2T+ annually) with online "
            "retail penetration ~28% of total retail — the highest globally. Online retail "
            "growth has been the key driver of total retail resilience even as offline "
            "retail stagnates. The annual series captures full-year platform sales (Alibaba, "
            "JD, PDD, TikTok Shop). Structural drivers: mobile commerce, livestreaming "
            "shopping, rural e-commerce expansion. Cross-reference with aCNWRTCOS "
            "(cosmetics sub-category) and aCNCNZHYBM (auto retail)."
        ),
        "related_series": ["aCNWRTCOS", "aCNCNZHYBM", "aCNWRTCOSGR", "aCNCNODEEM"],
    },

    "aCNCNGWFJ": {
        "meaning": (
            "Property insurance companies — original premium income, special risk insurance. "
            "Annual series from CBIRC. Covers specialty lines including nuclear, aviation, "
            "satellite, and other non-standard risks."
        ),
        "how_to_use": (
            "Special risk (特殊风险) insurance premium growth tracks China's development of "
            "advanced industrial risks — nuclear power expansion (China has the world's "
            "largest nuclear build program), commercial aerospace (Long March rockets, "
            "Shenzhou spacecraft), and offshore energy. Rising premiums signal China's "
            "ascent in advanced technology with associated insurance needs. Use with "
            "nuclear power generation capacity data and aerospace program budgets."
        ),
        "related_series": ["aCNCNKJBP", "aCNCNPDZM", "aCNCNOOTHM", "aCNCNOZFOM"],
    },

    "aCNWRTCOS": {
        "meaning": (
            "Retail sales, cosmetics, total value. Monthly series from NBS. Measures consumer "
            "spending on cosmetics through enterprises above designated size (annual revenue "
            ">CNY 5M)."
        ),
        "how_to_use": (
            "Cosmetics retail is a premium consumption indicator — sensitive to consumer "
            "confidence and income growth. China is the world's second-largest cosmetics "
            "market. The rise of domestic brands ('guochao' — national trend) has challenged "
            "L'Oreal, Estee Lauder, and LVMH in China. Rapid growth in cosmetics retail "
            "signals premiumization of consumption; contraction (as in 2022-23) reflects "
            "the 'consumption downgrade' narrative. Pair with aCNWRTCOSGR (YoY growth) "
            "for trend monitoring."
        ),
        "related_series": ["aCNWRTCOSGR", "aCNCNROGS", "aCNCNZHYBM", "aCNCNSTLAR"],
    },

    "aCNWRTCOSGR": {
        "meaning": (
            "Retail sales, cosmetics, year-over-year change (%). Monthly series from NBS. "
            "Growth rate of cosmetics consumer spending."
        ),
        "how_to_use": (
            "The cosmetics YoY growth rate is a high-frequency consumer sentiment gauge. "
            "It leads broader retail sales recovery/deterioration by 1-2 months (cosmetics "
            "are discretionary but low-ticket vs durables). Deep negative readings in 2022 "
            "(lockdowns) reversed to strong positive in 2023 (revenge spending), then "
            "moderated into 2024 (consumer caution). Use as a leading indicator for "
            "consumer confidence and luxury/beauty sector equity positioning."
        ),
        "related_series": ["aCNWRTCOS", "aCNCNROGS", "aCNCNZHYBM", "aCNCNSTLAR"],
    },

    "aCNCNZHYBM": {
        "meaning": (
            "Retail sales of enterprises above designated size — passenger cars. Monthly "
            "series from NBS / CAAM (China Association of Automobile Manufacturers). "
            "Measures auto retail sales value."
        ),
        "how_to_use": (
            "Auto retail is the single largest category of China's consumer goods retail "
            "and the bellwether of the consumption cycle. China is the world's largest "
            "auto market (~25M passenger cars/year). EV penetration has surged to ~35% "
            "of new car sales (2024). Monitor for: (1) NEV vs ICE split (structural shift), "
            "(2) price war impact on revenue growth vs unit sales growth, (3) export boom "
            "(China became world's #1 auto exporter in 2023). Use with aCNCNROGS and "
            "aCNWRTCOSGR for consumption cycle context."
        ),
        "related_series": ["aCNWRTCOS", "aCNCNROGS", "aCNCNQQBR", "aCNCNSTLAR"],
    },

    "aCNT2SPSRCW": {
        "meaning": (
            "Sales revenue — coal mining, washing, and dressing sector. Monthly series from "
            "NBS industrial enterprise survey. Measures total revenue of the coal mining "
            "sub-sector."
        ),
        "how_to_use": (
            "Coal mining revenue tracks both coal price and volume — the two determinants "
            "of China's most critical energy sector's financial health. Post-2021 coal price "
            "spike massively boosted mining revenues; subsequent normalization has pressured "
            "profitability. Shanxi and Inner Mongolia government fiscal revenues are "
            "directly tied to coal-sector revenues via royalties and taxes. Declining revenue "
            "signals fiscal stress in coal-dependent provinces and potential LGFV stress."
        ),
        "related_series": ["aCNT2SPSRFM", "aCNT2SPSRNF", "aCNINVPNF", "aCNCNSTLAR"],
    },

    "aCNT2SPSRFM": {
        "meaning": (
            "Sales revenue — ferrous metals mining and dressing sector. Monthly series from "
            "NBS industrial enterprise survey. Measures total revenue of iron ore and "
            "ferrous metals mining."
        ),
        "how_to_use": (
            "Ferrous metals (iron ore, steel) revenue is one of the most direct proxies for "
            "China's construction and manufacturing cycle. The property sector crisis (2021-) "
            "has been devastating for ferrous metals demand — steel demand for real estate "
            "dropped ~40% from peak. Revenue here tracks the magnitude of the industrial "
            "steel-demand contraction. Export of cheap Chinese steel to global markets is "
            "creating trade tensions. Pair with aCNINVPNF for full metals sector picture."
        ),
        "related_series": ["aCNT2SPSRCW", "aCNT2SPSRNF", "aCNCNSTLAR", "aCNCNINVPNG"],
    },

    "aCNT2SPSRNF": {
        "meaning": (
            "Sales revenue — non-ferrous metals mining and dressing sector. Monthly series "
            "from NBS industrial enterprise survey. Covers copper, aluminium, lead, zinc, "
            "nickel, lithium, rare earths, and other non-ferrous metal mining."
        ),
        "how_to_use": (
            "Non-ferrous metals revenue is the critical clean-energy transition indicator: "
            "copper (power cables, EVs), lithium (batteries), cobalt (batteries), rare "
            "earths (magnets for EVs and wind turbines). China dominates global production "
            "and refining of most critical minerals. Lithium mining revenue boom (2022-23) "
            "followed by bust (2024) directly impacted this series. Rising non-ferrous "
            "revenue driven by lithium/copper tracks the green transition supply chain."
        ),
        "related_series": ["aCNT2SPSRFM", "aCNT2SPSRCW", "aCNCNSTLAR", "aCNCNRUNM"],
    },
}
