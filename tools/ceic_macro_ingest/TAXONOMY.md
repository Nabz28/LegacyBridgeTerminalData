# Existing Macro Terminal taxonomy (Indonesia, country='id')

The terminal's Data Gatherer browses by **category_slug**. REUSE these existing slugs wherever a series fits.
Only propose a NEW slug if NOTHING fits, following the pattern `id_<snake_case>` and reusing/adding a sensible `section` + human `category`.

| category_slug | section | category |
|---|---|---|
| id_gdp_by_expenditure | National Accounts | GDP by Expenditure |
| id_gdp_gva_by_industries | National Accounts | GDP/GVA by Industry |
| id_gdp_deflators | National Accounts | GDP Deflators |
| id_consumption | National Accounts | Consumption |
| id_investment_capital_allocation | National Accounts | Investment / Capital Formation |
| id_income_savings | National Accounts | Incomes & Savings |
| id_foreign_transactions | National Accounts | Foreign Transactions |
| id_other_national_accounts | National Accounts | Other National Accounts |
| id_balance_of_payments | External Sector | Balance of Payments |
| id_external_debt | External Sector | External Debt |
| id_imports_exports | External Sector | Imports & Exports |
| id_international_investment_position | External Sector | International Investment Position |
| id_international_reserves | Money & Finance | International Reserves |
| id_central_bank | Money & Finance | Central Banking |
| id_interest_rates | Money & Finance | Interest Rates |
| id_exchange_rate_operations | Money & Finance | Exchange Rates & Operations |
| id_money_supply | Money & Finance | Money Supply |
| id_stock_bonds_funds | Money & Finance | Stocks, Bonds & Funds |
| id_banking | Money & Finance | Banking |
| id_government_accounts | Government Sector | Government Accounts |
| id_government_debt_borrowing | Government Sector | Government Debt & Borrowing |
| id_employment_hours | Labor Market | Employment & Hours |
| id_wages_earnings | Labor Market | Wages & Earnings |
| id_workforce_unemployment | Labor Market | Workforce & Unemployment |
| id_business_surveys | Surveys & Forecasts | Business Surveys |
| id_consumer_surveys | Surveys & Forecasts | Consumer Surveys |
| id_cyclical_activity_indices | Surveys & Forecasts | Cyclical & Activity Indices |
| id_retail_sales | Consumer Sector | Retail Sales |
| id_personal_expenditures | Consumer Sector | Personal Expenditures |
| id_consumer_finances | Consumer Sector | Consumer Finance |
| id_population | Consumer Sector | Population |
| id_industrial_production_utilization | Industry Sector | Industrial Production & Utilization |
| id_housing_construction | Industry Sector | Housing & Construction |

## New slugs ALLOWED (no existing fit) — use these exact ones if needed:
| category_slug | section | category |
|---|---|---|
| id_consumer_prices | Prices & Inflation | Consumer Prices (CPI) |
| id_producer_prices | Prices & Inflation | Producer & Wholesale Prices |
| id_capital_markets | Money & Finance | Capital Markets & Equities |
| id_payment_systems | Money & Finance | Payment & Settlement Systems |
| id_foreign_investment | External Sector | Foreign Investment (FDI/PMDN) |
| id_government_revenue | Government Sector | Government Revenue |

## Suggested file → category_slug mapping (apply unless data says otherwise):
- *GDP_byExpenditure* → id_gdp_by_expenditure ; *GDP_byExpenditureIndustry*/*GDP_Quarterly*/*GRDP* → id_gdp_gva_by_industries ; *GNI* → id_income_savings
- *CPI*/*CoreInflation* → id_consumer_prices ; *ProducerPriceIndex*/*WholesalePrice* → id_producer_prices
- *MoneySupply*/*M2components*/*ReserveMoney* → id_money_supply ; *InterestFXRates*/*DepositLendingRates*/*IndONIA* → id_interest_rates
- *ExchangeRate*/*REER_NEER* → id_exchange_rate_operations ; *ForeignExchangeReserves* → id_international_reserves
- *SharePriceIndex*/*IDX_*/*MutualFund*/*CorporateBondMarket*/*GovBondYieldCurve*/*GovtSecuritiesOwnership* → id_capital_markets
- *CommercialBank_CreditDeposits*/*Banking_LoansNPL*/*LoansByTypeOfUse* → id_banking
- *RTGS*/*ClearingSettlement_SKNBI* → id_payment_systems
- *BalanceOfPayments* → id_balance_of_payments ; *CurrentAccount*/*TradeBalance* → id_balance_of_payments ; *ExternalDebt* → id_external_debt ; *Exports*/*Imports*ByCommodity*/*External_Exports* → id_imports_exports
- *FDI_byOriginSector*/*DomesticInvestment_PMDN* → id_foreign_investment
- *GovernmentDebt* → id_government_debt_borrowing ; *GovtExpenditure* → id_government_accounts ; *TaxRevenue*/*GovtRevenue* → id_government_revenue ; *GovtSubsidies* → id_government_accounts
- *Unemployment*/*LabourForce* → id_workforce_unemployment ; *Wages*/*MinimumWage* → id_wages_earnings ; *LabourForceParticipation* → id_workforce_unemployment
- *IPI_byManufacturingSector*/*CapacityUtilization* → id_industrial_production_utilization
- *ConsumerConfidence* → id_consumer_surveys ; *BusinessTendency*/*ManufacturingPMI*/*LeadingIndicator_CLI* → id_business_surveys
- *RetailSalesIndex*/*RealRetailSalesIndex* → id_retail_sales

## Frequency tags (already computed, ISO-8601 duration): P1D=daily, P1M=monthly, P3M=quarterly, P6M=semiannual, P1Y=annual.
