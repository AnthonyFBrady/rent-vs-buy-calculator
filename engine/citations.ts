// Academic foundation surfaced on the methodology page.
// Source-of-truth for citations rendered in the UI.

export interface Citation {
  id: string;
  authors: string;
  year: number;
  title: string;
  venue: string;
  url: string;
  keyFinding: string;
  relevance: string;
}

export const CITATIONS: Citation[] = [
  {
    id: 'eichholtz-2021',
    authors: 'Eichholtz, P., Korevaar, M., Lindenthal, T., & Tallec, R.',
    year: 2021,
    title: 'The Total Return and Risk to Residential Real Estate',
    venue: 'Review of Financial Studies, 34(8), 3608-3646',
    url: 'https://academic.oup.com/rfs/article/34/8/3608/6222230',
    keyFinding:
      'Long-run real returns on residential real estate were 4-5% nominal, entirely from rental yields, with near-zero real capital appreciation across Paris (1809-1943) and Amsterdam (1900-1979).',
    relevance:
      'The foundation of the 3% cost-of-capital component in the 5% Rule. Without rental income, real estate appreciates roughly at inflation. The opportunity cost vs equities is real.',
  },
  {
    id: 'chambers-2021',
    authors: 'Chambers, D., Spaenjers, C., & Steiner, E.',
    year: 2021,
    title: 'The Rate of Return on Real Estate: Long-Run Micro-Level Evidence',
    venue: 'Review of Financial Studies, 34(8), 3572-3600',
    url: 'https://academic.oup.com/rfs/article/34/8/3572/6187963',
    keyFinding:
      'Oxbridge college property data 1901-1983. Annualized real returns ~2.3% residential, ~4.5% agricultural, ~4.5% commercial. Long-term real income growth near zero.',
    relevance:
      'Independent confirmation of low residential real returns from a different long-horizon data set.',
  },
  {
    id: 'beracha-johnson-2011',
    authors: 'Beracha, E., & Johnson, K. H.',
    year: 2011,
    title:
      'Lessons from Over 30 Years of Buy Versus Rent Decisions: Is the American Dream Always Wise?',
    venue: 'SSRN Electronic Journal',
    url: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1814227',
    keyFinding:
      'Over 30-year holding periods, renting and investing the difference outperformed buying in most periods. Established the BH&J Buy-vs-Rent Index.',
    relevance:
      'US-context empirical evidence aligned with Felix\'s Canadian thesis. Validates the rent-and-invest path as a credible wealth strategy.',
  },
  {
    id: 'beracha-hardin-johnson-2020',
    authors: 'Beracha, E., Hardin, W. G., & Johnson, K. H.',
    year: 2020,
    title: 'Can the BH&J Buy vs. Rent Index Anticipate Housing Price Movements?',
    venue: 'Journal of Housing Research, 29(1)',
    url: 'https://www.tandfonline.com/doi/abs/10.1080/10527001.2020.1831827',
    keyFinding:
      'The BH&J Index shows a negative relation to future price changes, validating it as a forward-looking valuation signal.',
    relevance:
      'Supports the price-to-rent ratio as a forecasting tool, not just a snapshot of current valuation.',
  },
  {
    id: 'jorda-2019',
    authors: 'Jordà, Ò., Knoll, K., Kuvshinov, D., Schularick, M., & Taylor, A. M.',
    year: 2019,
    title: 'The Rate of Return on Everything, 1870-2015',
    venue: 'NBER Working Paper W24112',
    url: 'https://www.nber.org/papers/w24112',
    keyFinding:
      '16 advanced economies 1870-2015. Total real residential returns ~7% (including rental income), far less volatile than equities.',
    relevance:
      'The benchmark for residential real estate as an asset class. Felix uses this to frame opportunity cost.',
  },
  {
    id: 'pwl-2025',
    authors: 'PWL Capital',
    year: 2025,
    title: 'Renting vs. Owning a Home in Canada 2005-2024',
    venue: 'PWL Capital White Paper',
    url: 'https://pwlcapital.com/wp-content/uploads/2025/08/PWL-Capital-Renting-vs.-Owning-a-Home-in-Canada-2005-2024.pdf',
    keyFinding:
      'Across 12 Canadian cities 2005-2024: renters won 7 of 12 in the baseline case. Owners won 10 of 12 with high investment fees or low savings discipline. Across 48 rolling 5-year windows, renters won 71% of the time.',
    relevance:
      'The empirical Canadian validation set. This calculator must reproduce these outcomes within ±5% before its math is trustworthy.',
  },
  {
    id: 'pwl-2017',
    authors: 'Felix, B.',
    year: 2017,
    title: 'The Case for Renting',
    venue: 'PWL Capital White Paper',
    url: 'https://pwlcapital.com/wp-content/uploads/2024/08/2017-07-07_Felix-Benjamin_The-Case-for-Renting_FINAL.pdf',
    keyFinding:
      'Foundational framework for treating homeownership as a consumption decision rather than an investment.',
    relevance:
      'The original PWL articulation of the framework this calculator implements.',
  },
];
