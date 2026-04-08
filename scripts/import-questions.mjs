/**
 * One-time script to import 50 new questions into Firebase.
 * Run with: node scripts/import-questions.mjs
 */
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyAHnvT7oyR9HclZmcO-5ehkR1kMeVmzkSg",
  authDomain: "cap-table-catastrophe.firebaseapp.com",
  databaseURL: "https://cap-table-catastrophe-default-rtdb.firebaseio.com",
  projectId: "cap-table-catastrophe",
  storageBucket: "cap-table-catastrophe.firebasestorage.app",
  messagingSenderId: "777636045302",
  appId: "1:777636045302:web:b594763cbe0d208de527d7",
}

const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

const newQuestions = [
  // ── Equity Compensation Basics ───────────────────────────────────────────
  {
    id: "q051",
    question: "What is a PSU (Performance Stock Unit)?",
    choices: [
      "An RSU whose number of vesting shares depends on achieving predetermined performance goals",
      "A special stock option reserved for C-suite executives",
      "A stock unit valued at the par value of the underlying shares",
      "A unit in a pension-linked stock allocation program"
    ],
    correctIndex: 0,
    category: "Equity Compensation Basics",
    difficulty: "medium",
    explanation: "PSUs (Performance Stock Units) vest based on performance metrics such as revenue, EPS, or TSR. If targets are exceeded, employees may receive more than 100% of the target award; if missed, they may receive less — or nothing.",
    active: true
  },
  {
    id: "q052",
    question: "What is a 'cashless exercise' (same-day sale) of stock options?",
    choices: [
      "Exercising options and immediately selling enough shares to cover the exercise price and taxes, keeping only the net shares or cash",
      "Exercising options without any payment by borrowing from a broker",
      "An ESPP purchase at a 0% discount requiring no cash outlay",
      "Exercising vested restricted stock without paying the par value"
    ],
    correctIndex: 0,
    category: "Equity Compensation Basics",
    difficulty: "easy",
    explanation: "A cashless (same-day sale) exercise lets employees exercise stock options without out-of-pocket cash. The broker simultaneously sells enough shares to cover the exercise price and applicable taxes; the remaining shares or net cash proceeds go to the employee.",
    active: true
  },
  {
    id: "q053",
    question: "What is a Stock Appreciation Right (SAR)?",
    choices: [
      "An award paying the appreciation in stock price above the grant price, in cash or shares, with no upfront payment required",
      "A right to receive dividends on unvested equity shares",
      "A discounted stock option reserved for board directors",
      "The right to approve a company's stock repurchase authorization"
    ],
    correctIndex: 0,
    category: "Equity Compensation Basics",
    difficulty: "medium",
    explanation: "A SAR grants the holder the right to receive the increase in stock price above a baseline grant price, settled in cash or shares. Unlike options, the holder pays nothing to exercise — they simply receive the net appreciation.",
    active: true
  },
  {
    id: "q054",
    question: "What is 'early exercise' in the context of startup stock options?",
    choices: [
      "Exercising unvested options into restricted stock immediately, often paired with an 83(b) election, to start the capital gains holding period early",
      "Exercising options before the company's fiscal year end to accelerate income recognition",
      "Exercising ISOs within the first calendar year of grant to qualify for ISO tax treatment",
      "A plan feature allowing all employees to exercise at the grant date price before vesting milestones are met"
    ],
    correctIndex: 0,
    category: "Equity Compensation Basics",
    difficulty: "medium",
    explanation: "Early exercise lets startup employees exercise unvested options into restricted stock immediately, typically with an 83(b) election filed within 30 days. This starts the capital gains holding period and can lock in a very low tax basis — particularly valuable when the stock price is low at grant.",
    active: true
  },
  {
    id: "q055",
    question: "What is an 'evergreen provision' in an equity incentive plan?",
    choices: [
      "A provision that automatically increases the plan's share reserve each year by a fixed number or percentage of outstanding shares",
      "A recycling provision that returns all forfeited shares to the available pool",
      "A clause that automatically renews the equity plan every 10 years without shareholder re-approval",
      "A provision protecting plan terms from change during a management transition"
    ],
    correctIndex: 0,
    category: "Equity Compensation Basics",
    difficulty: "medium",
    explanation: "An evergreen provision (automatic replenishment) adds shares to the equity plan reserve annually — typically 1–5% of total outstanding shares — without requiring a separate shareholder vote each year. It's common in tech company equity plans but scrutinized by proxy advisory firms for potential dilution.",
    active: true
  },
  {
    id: "q056",
    question: "What does 'net exercise' or 'net share settlement' mean for stock options?",
    choices: [
      "The company withholds enough shares to cover the exercise price and taxes, delivering only the net remaining shares to the employee",
      "The employee sells shares on the open market to net the proceeds against the exercise price",
      "Options that can be settled in either cash or stock at the company's election",
      "An exercise where option proceeds offset an outstanding employee loan"
    ],
    correctIndex: 0,
    category: "Equity Compensation Basics",
    difficulty: "medium",
    explanation: "In a net exercise (net share settlement), no cash changes hands. Instead, the company delivers the net number of shares after 'withholding' shares equivalent to the exercise price and required tax withholding — all in one transaction, resulting in fewer shares delivered than the full grant amount.",
    active: true
  },
  {
    id: "q057",
    question: "What is the maximum annual stock value an employee can purchase under a Section 423 ESPP?",
    choices: [
      "$25,000 in FMV of stock per calendar year (based on the FMV at the start of the offering period)",
      "$50,000 per offering period regardless of calendar year",
      "$10,000 per year as capped by IRS Publication 525",
      "There is no statutory dollar limit under Section 423"
    ],
    correctIndex: 0,
    category: "Equity Compensation Basics",
    difficulty: "medium",
    explanation: "Section 423 ESPPs impose a $25,000 annual accrual limit per employee, measured by the FMV of the stock on the first day of each offering period. This keeps the plan 'broadly available' and prevents executives from using the ESPP as a primary compensation vehicle.",
    active: true
  },
  {
    id: "q058",
    question: "What is 'single-trigger acceleration' in equity compensation?",
    choices: [
      "Vesting acceleration that occurs automatically upon a change of control alone, with no additional condition required",
      "Acceleration triggered by hitting a single stock-price target within one year of grant",
      "Acceleration applied once a single performance goal is achieved, regardless of employment status",
      "Acceleration approved by a single board vote rather than requiring full committee sign-off"
    ],
    correctIndex: 0,
    category: "Equity Compensation Basics",
    difficulty: "medium",
    explanation: "Single-trigger acceleration vests equity automatically upon a change of control, regardless of what happens to the employee. It is less common than double-trigger because it can make M&A transactions more expensive and doesn't require actual employee displacement to trigger the windfall.",
    active: true
  },
  {
    id: "q059",
    question: "What is a 'tandem award' in equity compensation?",
    choices: [
      "An award pairing two equity instruments (e.g., a SAR and a stock option) where exercising one automatically cancels the other",
      "A joint equity grant issued to two employees who share a role",
      "An award that vests in two simultaneous tranches on the same date",
      "A dual-currency equity award structured for globally mobile employees"
    ],
    correctIndex: 0,
    category: "Equity Compensation Basics",
    difficulty: "hard",
    explanation: "A tandem award combines two equity instruments — most commonly an SAR alongside a stock option. Exercising the SAR cancels the option and vice versa, giving the holder flexibility to choose cash (SAR) or shares (option). Tandem awards are rarely used today due to accounting complexity under ASC 718.",
    active: true
  },
  {
    id: "q060",
    question: "What does it mean when an RSU is 'settled' in cash rather than shares?",
    choices: [
      "The company pays the employee the cash equivalent of the share value on the vest date instead of delivering actual shares",
      "The employee sells vested RSU shares immediately on the vest date for cash",
      "The RSU award is converted to a cash bonus because shares are unavailable",
      "The company uses treasury shares to satisfy the RSU obligation without issuing new stock"
    ],
    correctIndex: 0,
    category: "Equity Compensation Basics",
    difficulty: "medium",
    explanation: "Cash-settled RSUs pay the employee the FMV of the underlying shares on the vest date in cash rather than delivering actual shares. This is common for employees in countries where share delivery is impractical due to exchange controls or securities restrictions. Cash-settled awards are classified as liabilities under ASC 718.",
    active: true
  },

  // ── Tax & Compliance ─────────────────────────────────────────────────────
  {
    id: "q061",
    question: "What is the federal supplemental income tax withholding rate applied to equity vest and exercise income up to $1 million?",
    choices: ["22%", "25%", "37%", "28%"],
    correctIndex: 0,
    category: "Tax & Compliance",
    difficulty: "medium",
    explanation: "The IRS mandatory flat supplemental withholding rate is 22% for supplemental wages up to $1 million per year (as of 2024). Supplemental wages exceeding $1 million in a single calendar year are subject to mandatory withholding at the top marginal rate of 37%. Employers may alternatively aggregate and use the employee's W-4 rate.",
    active: true
  },
  {
    id: "q062",
    question: "Under Section 162(m), deductions for covered employee compensation at public companies are limited to what annual amount?",
    choices: ["$1 million per covered employee", "$5 million per covered employee", "$10 million per covered employee", "There is no limit if compensation is performance-based"],
    correctIndex: 0,
    category: "Tax & Compliance",
    difficulty: "medium",
    explanation: "Section 162(m) limits the corporate tax deduction for compensation paid to 'covered employees' (the CEO, CFO, and the next 3 highest-paid officers at public companies) to $1 million per year. The TCJA of 2017 eliminated the prior exception for qualified performance-based compensation.",
    active: true
  },
  {
    id: "q063",
    question: "What is QSBS (Section 1202 stock) and what is its primary tax benefit?",
    choices: [
      "Qualified Small Business Stock — potentially excludes up to 100% of capital gains from federal income tax if held 5+ years in a qualifying C-corporation",
      "Qualified Share Bonus Scheme — a government-subsidized equity plan for startup employees",
      "Qualified Stock Bonus Settlement — an accounting method for equity award settlements",
      "Quasi-Stock Benefit System — an IRS-approved deferred compensation alternative"
    ],
    correctIndex: 0,
    category: "Tax & Compliance",
    difficulty: "hard",
    explanation: "Under IRC Section 1202, QSBS issued by eligible C-corporations can be excluded from federal capital gains tax — up to 100% exclusion for stock acquired after September 27, 2010 and held for more than 5 years. Per-issuer limits apply ($10M or 10x adjusted basis). A massive benefit for startup founders and early employees.",
    active: true
  },
  {
    id: "q064",
    question: "What does the 'wash sale rule' prohibit that's relevant to equity compensation?",
    choices: [
      "Selling shares at a loss and reacquiring substantially identical stock within 30 days before or after the sale to claim the capital loss",
      "Selling ESPP shares within the qualifying period while claiming favorable tax treatment",
      "Selling ISO shares within 90 days of exercise and claiming capital gains treatment",
      "Reinvesting vested RSU proceeds immediately back into company stock in an ESPP"
    ],
    correctIndex: 0,
    category: "Tax & Compliance",
    difficulty: "medium",
    explanation: "The wash sale rule (IRC §1091) disallows a capital loss deduction when you sell a security at a loss and buy the same or substantially identical security within 30 days before or after the sale. Relevant for equity holders who sell underwater shares and want to maintain their position — they must wait 31 days to preserve the loss.",
    active: true
  },
  {
    id: "q065",
    question: "What is state 'apportionment' or 'sourcing' in the context of multi-state equity taxation?",
    choices: [
      "Allocating equity award income across multiple states based on the proportion of the vesting period worked in each state",
      "Distributing RSU shares proportionally among benefit-eligible employees in different states",
      "Dividing tax liability between employer and employee based on where the company is incorporated",
      "Splitting ISO and NSO gains between state and federal tax jurisdictions"
    ],
    correctIndex: 0,
    category: "Tax & Compliance",
    difficulty: "hard",
    explanation: "State apportionment (sourcing) allocates equity income to each state where the employee worked during the award's vesting period. A person who moved between states while vesting an award may owe income taxes to multiple states — each state taxes its proportionate share. This creates significant compliance complexity for mobile employees.",
    active: true
  },
  {
    id: "q066",
    question: "What is the Dodd-Frank mandatory clawback requirement for public companies?",
    choices: [
      "Public companies must adopt policies to recover (claw back) incentive compensation from executive officers if financial results triggering that pay are later restated",
      "Companies must claw back equity grants if the employee breaches a non-compete agreement within 2 years",
      "Companies must recover ESPP discount benefits from employees who resign within 1 year of purchase",
      "Companies must clawback awards granted during a blackout period that was later found to be in violation"
    ],
    correctIndex: 0,
    category: "Tax & Compliance",
    difficulty: "hard",
    explanation: "SEC Rule 10D-1 (implementing Dodd-Frank Section 954) requires all listed companies to adopt, disclose, and enforce clawback policies that recover incentive-based compensation from current and former executive officers following an accounting restatement — regardless of whether any misconduct occurred.",
    active: true
  },
  {
    id: "q067",
    question: "When an employee sells RSU shares, what is their cost basis for calculating capital gain or loss?",
    choices: [
      "The FMV of the shares on the vest date — the same amount already reported as ordinary W-2 income",
      "Zero, since RSUs require no cash payment by the employee",
      "The grant-date fair market value of the award",
      "The average of the grant-date price and the vest-date price"
    ],
    correctIndex: 0,
    category: "Tax & Compliance",
    difficulty: "medium",
    explanation: "For RSUs, cost basis equals the FMV on the vest date — which was already included in the employee's W-2 as ordinary income. Any appreciation (or decline) after the vest date is a capital gain (or loss). If the employee holds shares after vest, the holding period for short vs. long-term capital gains starts on the vest date.",
    active: true
  },
  {
    id: "q068",
    question: "What is a 'disqualifying disposition' for Section 423 ESPP shares?",
    choices: [
      "Selling ESPP shares before meeting both required holding periods: 2 years from the offering date AND 1 year from the purchase date",
      "Transferring ESPP shares to a family member within 6 months of purchase",
      "Selling ESPP shares at a loss before any holding period expires",
      "Purchasing the maximum allowed shares in an offering period and immediately selling"
    ],
    correctIndex: 0,
    category: "Tax & Compliance",
    difficulty: "medium",
    explanation: "A disqualifying disposition of Section 423 ESPP shares occurs when shares are sold or transferred before meeting BOTH holding periods (2 years from offering start AND 1 year from purchase). This converts the discount element to ordinary income in the year of sale, losing the favorable qualifying disposition tax treatment.",
    active: true
  },
  {
    id: "q069",
    question: "What is an 'excess tax benefit' from equity awards?",
    choices: [
      "When the actual tax deduction at vest/exercise exceeds the book compensation expense recorded at grant, the difference flows as a benefit through the tax provision",
      "A tax refund available to companies that grant more than $1M in equity in a given year",
      "An additional corporate deduction for ESPP employer matching contributions",
      "A tax credit for granting equity awards to employees in government-designated opportunity zones"
    ],
    correctIndex: 0,
    category: "Tax & Compliance",
    difficulty: "hard",
    explanation: "An excess tax benefit (or tax windfall) occurs when the actual tax deduction — based on intrinsic value at vest/exercise — exceeds the cumulative ASC 718 book expense based on grant-date fair value. Under current ASC 718 rules, these benefits reduce income tax expense, improving the company's effective tax rate.",
    active: true
  },
  {
    id: "q070",
    question: "What is 'short-swing profit' liability under Section 16(b) of the Exchange Act?",
    choices: [
      "Profits from any purchase and sale (or sale and purchase) of company equity by an insider within a 6-month period must be disgorged to the company",
      "Penalties for insiders who sell shares within 6 months of an IPO lockup expiration",
      "Tax on gains from exercising stock options held for less than 6 months",
      "Liability for executives who reprice their options within 6 months of a prior grant"
    ],
    correctIndex: 0,
    category: "Tax & Compliance",
    difficulty: "hard",
    explanation: "Section 16(b) requires Section 16 insiders (directors, officers, and 10%+ holders) to disgorge to the company any profits from 'short-swing' transactions — any purchase and sale (or sale and purchase) of company equity matched within any 6-month period. Liability is strict, regardless of intent or use of MNPI.",
    active: true
  },

  // ── Administration & Operations ──────────────────────────────────────────
  {
    id: "q071",
    question: "What is 'plan overhang' in equity compensation?",
    choices: [
      "The total dilutive impact of all outstanding awards plus shares available for future grants, expressed as a percentage of total shares outstanding",
      "The excess shares remaining in the plan reserve after all scheduled grants are made",
      "Stock options that remain unexercised past their vesting date but before expiration",
      "Shares issued in error that exceed the board-authorized equity plan limit"
    ],
    correctIndex: 0,
    category: "Administration & Operations",
    difficulty: "medium",
    explanation: "Overhang = (shares subject to outstanding awards + shares available for future grants) ÷ total diluted shares outstanding. Proxy advisory firms like ISS and Glass Lewis track overhang closely as a measure of potential dilution to current shareholders. High overhang can trigger negative vote recommendations on equity plan proposals.",
    active: true
  },
  {
    id: "q072",
    question: "What is a 'say-on-pay' vote at a public company?",
    choices: [
      "A non-binding advisory shareholder vote on executive compensation practices, required by the Dodd-Frank Act at least every 3 years",
      "A binding shareholder vote that must approve every individual equity grant above $1M",
      "An annual employee vote on the terms of their own equity awards",
      "A Board resolution required before a CEO compensation package can take effect"
    ],
    correctIndex: 0,
    category: "Administration & Operations",
    difficulty: "medium",
    explanation: "Say-on-pay (SOP) is a non-binding shareholder advisory vote on named executive officer (NEO) compensation, required under Dodd-Frank at least every 3 years. While non-binding, a failed SOP vote (below 50% support) typically triggers significant shareholder engagement and governance scrutiny.",
    active: true
  },
  {
    id: "q073",
    question: "What is 'share recycling' in an equity plan?",
    choices: [
      "Returning shares to the available pool when awards are forfeited, cancelled, or expire unexercised",
      "Repurchasing shares on the open market to fund upcoming RSU deliveries",
      "Allowing employees to exchange old underwater options for new in-the-money grants",
      "Using previously repurchased treasury shares to satisfy equity award obligations"
    ],
    correctIndex: 0,
    category: "Administration & Operations",
    difficulty: "medium",
    explanation: "Share recycling provisions allow a plan to add back shares that are forfeited, cancelled, or expire without exercise. More liberal recycling provisions also add back shares withheld for tax withholding or used to pay option exercise prices. Proxy advisory firms generally prefer plans that recycle only forfeited/cancelled shares.",
    active: true
  },
  {
    id: "q074",
    question: "What does 'TSR' stand for, and how is it used in executive equity programs?",
    choices: [
      "Total Shareholder Return — measuring stock price appreciation plus reinvested dividends, commonly used as a performance metric in PSU/PRSU awards",
      "Total Stock Reserve — the remaining shares in the equity plan authorized but not yet granted",
      "Tax-Sheltered Return — a measure of after-tax equity compensation value for planning purposes",
      "Transfer and Settlement Report — the operational document accompanying equity award deliveries"
    ],
    correctIndex: 0,
    category: "Administration & Operations",
    difficulty: "medium",
    explanation: "TSR (Total Shareholder Return) measures return to shareholders: stock price change + dividends reinvested. Relative TSR (rTSR) — comparing a company's TSR to a peer group or index — is one of the most common performance metrics in executive PSU programs, aligning pay with competitive shareholder value creation.",
    active: true
  },
  {
    id: "q075",
    question: "What is a 'unanimous written consent' (UWC) used for in equity administration?",
    choices: [
      "A written Board approval of equity grants signed by all directors, used in lieu of a formal board meeting",
      "A written acknowledgment from all employees confirming receipt of their grant agreements",
      "A shareholder consent form required when adding shares to the equity plan reserve",
      "A signed consent required from all affected employees before modifying equity award terms"
    ],
    correctIndex: 0,
    category: "Administration & Operations",
    difficulty: "medium",
    explanation: "A Unanimous Written Consent (UWC) allows a company's board (or compensation committee) to approve equity grants without convening a formal meeting — as long as all directors sign. This is standard practice for routine grant approvals between board meetings and is legally equivalent to a board resolution.",
    active: true
  },
  {
    id: "q076",
    question: "What is a Form S-8 and why does it matter for employee equity?",
    choices: [
      "A simplified SEC registration form used by public companies to register shares offered under employee benefit and equity plans",
      "The IRS form used to report stock option exercises to the SEC",
      "A Form used by employees to make Section 83(b) elections for restricted stock",
      "A Section 8 compliance report filed annually with the SEC regarding equity plan overhang"
    ],
    correctIndex: 0,
    category: "Administration & Operations",
    difficulty: "hard",
    explanation: "Form S-8 is an SEC registration form for shares to be issued under employee benefit plans (including equity incentive plans). Unlike a full S-1, it is simpler to file and incorporates the company's existing Exchange Act reports. Once shares are registered on S-8, employees can freely resell them (unless subject to affiliate restrictions).",
    active: true
  },
  {
    id: "q077",
    question: "What is an 'inducement grant' and when can it be made without shareholder approval?",
    choices: [
      "An equity award made outside the shareholder-approved plan as an inducement to a new hire — permitted under NYSE/Nasdaq rules without a shareholder vote if approved by the compensation committee",
      "A grant made to induce an existing employee to reach a difficult performance milestone, requiring special Board approval",
      "A discounted equity grant made to investment banks as an inducement to complete a financing",
      "An above-market grant made to prevent a key executive from accepting a competing offer"
    ],
    correctIndex: 0,
    category: "Administration & Operations",
    difficulty: "hard",
    explanation: "Inducement grants are equity awards (options, RSUs) made to newly hired employees as an inducement to accept employment, outside the shareholder-approved plan. Both NYSE and Nasdaq rules permit such awards without a shareholder vote, provided the compensation committee approves them and they are publicly disclosed via a press release or 8-K.",
    active: true
  },
  {
    id: "q078",
    question: "What happens to outstanding equity awards when a company does a 2-for-1 stock split?",
    choices: [
      "Share counts double and exercise/purchase prices are halved, preserving the economic value of all outstanding awards",
      "All unvested awards are cancelled and reissued at the post-split price",
      "Only vested awards are adjusted; unvested awards remain at original pre-split terms",
      "Stock splits do not affect equity awards — only outstanding common shares are adjusted"
    ],
    correctIndex: 0,
    category: "Administration & Operations",
    difficulty: "easy",
    explanation: "In a stock split, equity plans include anti-dilution provisions requiring proportional adjustments to outstanding awards. In a 2-for-1 split: share counts double and option exercise prices halve, maintaining the same pre-split economic value. This is transparent to award holders — their total equity value is unchanged.",
    active: true
  },
  {
    id: "q079",
    question: "What is a 'dividend equivalent right' (DER) on an RSU award?",
    choices: [
      "A right to receive the economic equivalent of dividends paid on the underlying shares during the vesting period, typically accrued and paid at vest",
      "A right to receive quarterly dividend payments on unvested RSU shares immediately when declared",
      "A cash payment made to RSU holders equal to the total dividends paid since the grant date, paid at grant",
      "A supplemental equity grant issued in lieu of cash dividends on outstanding RSU awards"
    ],
    correctIndex: 0,
    category: "Administration & Operations",
    difficulty: "medium",
    explanation: "Dividend equivalent rights (DERs) allow RSU holders to receive the economic benefit of dividends declared on underlying shares during the vesting period. They're typically accrued and paid in cash (or as additional RSUs) when the underlying award vests and settles, aligning RSU holders with shareholder dividend economics.",
    active: true
  },
  {
    id: "q080",
    question: "What proxy advisory firm guidelines do most large institutional investors rely on when voting on equity plan proposals?",
    choices: [
      "ISS (Institutional Shareholder Services) and Glass Lewis — both publish annual policies that evaluate equity plans on dilution, plan cost, and governance features",
      "The SEC Office of Investor Advocacy publishes binding guidelines that all institutions must follow",
      "FASB issues annual guidance on equity plan governance that proxy advisors adopt verbatim",
      "The NASPP publishes a proxy voting handbook that serves as the industry standard"
    ],
    correctIndex: 0,
    category: "Administration & Operations",
    difficulty: "medium",
    explanation: "ISS (Institutional Shareholder Services) and Glass Lewis are the dominant proxy advisory firms. Their annual equity plan guidelines — covering dilution rates, plan cost (Shareholder Value Transfer), burn rate, and specific plan features — heavily influence how institutional investors vote on equity plan and say-on-pay proposals at public company annual meetings.",
    active: true
  },

  // ── Global Equity ────────────────────────────────────────────────────────
  {
    id: "q081",
    question: "What is China's SAFE registration requirement for employee equity awards?",
    choices: [
      "Chinese employees must register their equity plan participation with SAFE (State Administration of Foreign Exchange) to legally hold and remit proceeds from foreign company equity",
      "A safety audit required before any equity can be granted to employees in China",
      "A simplified securities assessment for companies operating in China's special economic zones",
      "A Securities Authority Filing Exemption used for certain cross-border equity arrangements in China"
    ],
    correctIndex: 0,
    category: "Global Equity",
    difficulty: "hard",
    explanation: "China's SAFE requires companies with equity plans covering Chinese employees to register the plan and for employees to open special SAFE-approved foreign exchange accounts to receive and remit award proceeds. Non-compliance can result in penalties and employees being unable to access or transfer their equity proceeds outside China.",
    active: true
  },
  {
    id: "q082",
    question: "What is Israel's Section 102 Capital Gains Track for equity compensation?",
    choices: [
      "A tax-advantaged track where option/RSU gains are taxed at a capital gains rate (not ordinary income) if shares are deposited with a trustee for 24 months",
      "Section 102 of the Israeli Companies Law governing board approval requirements for equity plans",
      "An Israeli tax regulation providing a 102-day grace period for equity award reporting",
      "A treaty provision reducing Israeli withholding tax on equity proceeds for non-Israeli multinational employees"
    ],
    correctIndex: 0,
    category: "Global Equity",
    difficulty: "hard",
    explanation: "Israel's Section 102 Capital Gains Track (under the Israeli Income Tax Ordinance) taxes all equity gain at the 25% capital gains rate — rather than ordinary income rates of up to 50% — if shares are deposited with an approved trustee for at least 24 months. This is why Israeli tech companies are especially eager to use Section 102 for their employee equity plans.",
    active: true
  },
  {
    id: "q083",
    question: "What is France's 'actions gratuites' (free share) plan?",
    choices: [
      "A French qualified free share grant plan (AGA) where shares are granted at no cost and taxed at reduced rates after minimum 1-year vesting and 1-year holding periods",
      "A French government program providing free shares to all employees of listed CAC 40 companies",
      "A French ESPP equivalent offering shares at a 15% discount with a 2-year holding requirement",
      "A pan-European EU directive requiring all companies with 500+ employees to grant shares annually"
    ],
    correctIndex: 0,
    category: "Global Equity",
    difficulty: "hard",
    explanation: "French 'actions gratuites' (AGA plans, or Plans d'Attribution Gratuite d'Actions) allow companies to grant shares at no cost to employees. After a minimum 1-year vesting period and 1-year holding period, gains are taxed at a reduced rate: a portion as a salary surcharge and a portion as capital gains. AGAs are France's most popular equity vehicle for broad-based programs.",
    active: true
  },
  {
    id: "q084",
    question: "What is the Australian 'startup concession' for employee share schemes?",
    choices: [
      "A tax concession allowing qualifying startup employees to defer tax on equity until sale, with potential for discounted CGT treatment",
      "A 15% discount allowed on ESPP shares for employees of Australian startups",
      "A government grant covering half the FMV of equity awards at qualifying early-stage companies",
      "An exemption from ESS prospectus disclosure requirements for companies with under $5M revenue"
    ],
    correctIndex: 0,
    category: "Global Equity",
    difficulty: "hard",
    explanation: "Australia's startup concession (Division 83A of the ITAA 1997) allows employees of qualifying early-stage companies to receive discounted equity and defer tax until the point of sale. Capital gains may then qualify for the 50% CGT discount if the shares were held for 12+ months. It was introduced to help Australian startups compete for talent against US companies offering equity.",
    active: true
  },
  {
    id: "q085",
    question: "What is Canada's treatment of stock option benefits under the post-2021 rules?",
    choices: [
      "A 50% deduction is available (capital gains-like treatment) for options below an annual $200K vesting cap; options above the cap are fully taxable as employment income",
      "All Canadian stock option benefits are taxed at a flat 15% withholding rate",
      "Canadian employees can defer all option income until the shares are sold",
      "Canada eliminated the 50% stock option deduction entirely for all public company options in 2021"
    ],
    correctIndex: 0,
    category: "Global Equity",
    difficulty: "hard",
    explanation: "Under rules effective January 1, 2020 (delayed to 2021), Canada's 50% stock option deduction (resulting in capital gains-like rates) is limited to options vesting up to $200,000 per year (using the FMV at grant). Options above the $200K cap are fully taxable as employment income. CCPC options and grandfathered public company options may have different treatment.",
    active: true
  },
  {
    id: "q086",
    question: "How does IFRS 2 compare to ASC 718 for accounting equity awards?",
    choices: [
      "Both require recognizing grant-date fair value over the service period, but differ in areas like modification accounting, grant-date determination for graded vesting, and group plan treatment",
      "IFRS 2 requires immediate expensing of all equity awards at grant; ASC 718 allows amortization over vesting",
      "IFRS 2 uses intrinsic value rather than fair value, making it simpler than ASC 718",
      "IFRS 2 and ASC 718 are fully converged and produce identical results under all scenarios"
    ],
    correctIndex: 0,
    category: "Global Equity",
    difficulty: "hard",
    explanation: "Both IFRS 2 (international) and ASC 718 (US GAAP) require recognizing the grant-date fair value of share-based awards as expense over the service period. Key differences: IFRS 2 treats each tranche of a graded-vest award as a separate grant (accelerating expense); ASC 718 allows a straight-line method. They also differ in modification accounting and how parent company grants to subsidiary employees are treated.",
    active: true
  },
  {
    id: "q087",
    question: "What is the EU Prospectus Regulation's impact on employee equity plans in Europe?",
    choices: [
      "Offers of shares above €8M (thresholds vary by country) may require a prospectus, though employee share scheme exemptions typically apply — often requiring a simplified national exemption document",
      "All equity grants to EU employees require full ESMA (European Securities and Markets Authority) registration and approval",
      "The EU prohibits shares from being delivered to employees in EU countries unless the company is listed on a European exchange",
      "GDPR (EU privacy law) makes it illegal to process equity compensation data across EU member state borders"
    ],
    correctIndex: 0,
    category: "Global Equity",
    difficulty: "hard",
    explanation: "The EU Prospectus Regulation (EU 2017/1129) creates a requirement for a prospectus for public offers above certain thresholds. Employee share scheme exemptions exist across the EU, but many countries require a simplified 'exemption document' or national disclosure document, and some countries have unique local requirements — adding complexity to pan-European equity rollouts.",
    active: true
  },
  {
    id: "q088",
    question: "What is a 'mobile employee' tracking obligation in global equity?",
    choices: [
      "Tracking where an employee worked during an award's vesting period to correctly apportion equity income across countries and comply with each country's withholding and reporting obligations",
      "Monitoring whether mobile employees have sold company shares while traveling internationally",
      "A requirement to report employees' physical locations to global tax authorities on a quarterly basis",
      "Tracking when mobile employees access their equity platform from different countries to prevent insider trading"
    ],
    correctIndex: 0,
    category: "Global Equity",
    difficulty: "medium",
    explanation: "Mobile employee tracking requires companies to apportion equity award income across the countries where an employee worked during the full vesting period. Each country taxes its proportionate share. Failure to track mobility leads to incorrect withholding, unpaid taxes, penalties, and potential permanent establishment risks.",
    active: true
  },
  {
    id: "q089",
    question: "What is India's FEMA requirement for employee equity compensation?",
    choices: [
      "The Foreign Exchange Management Act requires Indian employees to receive equity awards only under RBI-approved schemes and limits the remittance of equity proceeds without regulatory compliance",
      "India's Financial Equity Management Authority requires all equity grants to Indian employees to be approved by the Finance Ministry",
      "FEMA mandates that Indian employees can only hold equity in companies listed on Indian stock exchanges",
      "India's Foreign Equity Management Act caps the total equity grant value for employees on work visas in India"
    ],
    correctIndex: 0,
    category: "Global Equity",
    difficulty: "hard",
    explanation: "India's FEMA (Foreign Exchange Management Act) governs cross-border capital flows, including equity compensation proceeds. Employees can receive foreign company equity under the Liberalized Remittance Scheme (LRS) or employer-approved schemes, but there are limits on annual remittances ($250K/year for individuals) and compliance requirements for repatriation of proceeds.",
    active: true
  },
  {
    id: "q090",
    question: "What is a 'cashless repatriation' challenge in global equity programs?",
    choices: [
      "Some countries restrict or tax the transfer of cash proceeds from equity award sales back to the employee's local bank account, requiring special structuring or approval",
      "The difficulty of processing same-day cashless option exercises in countries with limited brokerage infrastructure",
      "A challenge arising when the company has no local payroll to process equity withholding in a country",
      "Currency fluctuations making it impossible to accurately value equity proceeds in local currency"
    ],
    correctIndex: 0,
    category: "Global Equity",
    difficulty: "hard",
    explanation: "In countries with exchange controls (China, India, Brazil, parts of Africa), employees may face significant hurdles remitting the cash proceeds from equity award sales back to their local bank account. Companies must structure plans carefully, use approved remittance channels, and in some countries (like China) route proceeds through special SAFE-approved accounts.",
    active: true
  },

  // ── Fun / Industry Culture ────────────────────────────────────────────────
  {
    id: "q091",
    question: "What Florida city is home to a major equity compensation conference and is also famous for its theme parks?",
    choices: ["Orlando", "Miami", "Tampa", "Jacksonville"],
    correctIndex: 0,
    category: "Fun / Industry Culture",
    difficulty: "easy",
    explanation: "Orlando, Florida hosts several major equity compensation conferences, including the NASPP Annual Conference. The combination of top-tier convention facilities, warm weather year-round, and proximity to Disney World, Universal Studios, and other attractions makes Orlando a perennial favorite conference destination for stock plan professionals.",
    active: true
  },
  {
    id: "q092",
    question: "What is a 'unicorn' company in startup and venture capital terminology?",
    choices: [
      "A privately-held startup valued at $1 billion or more",
      "A startup that achieves profitability before raising any venture capital",
      "A company that IPOs within 12 months of its Series A funding round",
      "A company whose entire employee base becomes millionaires from their equity"
    ],
    correctIndex: 0,
    category: "Fun / Industry Culture",
    difficulty: "easy",
    explanation: "The term 'unicorn' was coined by venture capitalist Aileen Lee in 2013 to describe private startups valued at $1 billion or more — once considered as rare as a mythical creature. As of 2024, there are 1,000+ unicorns globally. 'Decacorns' are valued at $10B+ and 'hectocorns' at $100B+.",
    active: true
  },
  {
    id: "q093",
    question: "What was remarkable about WhatsApp employees' equity outcome when Facebook acquired the company for ~$19 billion in 2014?",
    choices: [
      "WhatsApp's ~55 employees collectively received approximately $3 billion — an average of over $50 million per person",
      "WhatsApp had no equity plan; all 55 employees received only Facebook stock grants post-acquisition",
      "WhatsApp's founder Jan Koum received all the equity and employees received cash bonuses",
      "WhatsApp employees received 4-year vesting packages in Facebook stock with no immediate liquidity"
    ],
    correctIndex: 0,
    category: "Fun / Industry Culture",
    difficulty: "medium",
    explanation: "Facebook's ~$19 billion acquisition of WhatsApp in 2014 made its approximately 55 employees collectively wealthy to the tune of roughly $3 billion — an average exceeding $50 million each. It stands as one of the most dramatic illustrations of broad-based startup equity value creation in history.",
    active: true
  },
  {
    id: "q094",
    question: "What is the 'PayPal Mafia' famous for in startup and equity culture?",
    choices: [
      "Former PayPal executives and employees who used equity proceeds from the $1.5B eBay acquisition to co-found companies including Tesla, LinkedIn, YouTube, and Palantir",
      "A group of equity compensation professionals who founded the CEP certification program after meeting at a PayPal-sponsored conference",
      "PayPal's internal equity team that pioneered the first automated stock plan administration platform",
      "A regulatory investigation into PayPal's early employee stock option backdating practices"
    ],
    correctIndex: 0,
    category: "Fun / Industry Culture",
    difficulty: "medium",
    explanation: "The 'PayPal Mafia' — including Elon Musk, Peter Thiel, Reid Hoffman, Chad Hurley, Steve Chen, and others — used the equity proceeds from PayPal's 2002 acquisition by eBay for $1.5 billion to fund a remarkable wave of new companies: Tesla, SpaceX, LinkedIn, YouTube, Palantir, Yelp, and more.",
    active: true
  },
  {
    id: "q095",
    question: "What is a 'SPAC' and how does it affect employee equity when a private company merges with one?",
    choices: [
      "Special Purpose Acquisition Company — a shell company that raises public funds to acquire a private company; employees' private equity converts to public shares, typically with a lockup period",
      "Stock Purchase Acquisition Contract — a legal structure replacing RSU programs in M&A transactions",
      "Share Price Adjustment Committee — a body that reprices equity awards following an acquisition event",
      "Securities and Private Assets Commission — the regulatory body overseeing pre-IPO equity grant activity"
    ],
    correctIndex: 0,
    category: "Fun / Industry Culture",
    difficulty: "medium",
    explanation: "A SPAC (Special Purpose Acquisition Company) is a blank-check shell company that IPOs solely to acquire a private company. For employees, a de-SPAC merger achieves a liquidity event similar to a traditional IPO — converting private equity to publicly tradeable shares — though SPAC lockups, earnout provisions, and dilution structures can differ significantly from traditional IPOs.",
    active: true
  },
  {
    id: "q096",
    question: "What is the 'CEP' designation and who awards it?",
    choices: [
      "Certified Equity Professional — awarded by the CEP Institute at Santa Clara University to equity compensation practitioners who pass three levels of exams",
      "Certified Executive Payroll — a credential for HR executives managing executive total compensation packages",
      "Corporate Equity Planner — a financial planning specialization credential for advisors focused on equity compensation",
      "Compliance and Equity Professional — an SEC-recognized certification for equity compliance officers at public companies"
    ],
    correctIndex: 0,
    category: "Fun / Industry Culture",
    difficulty: "easy",
    explanation: "The CEP (Certified Equity Professional) is the premier professional credential for stock plan administrators and equity compensation specialists. Awarded by the CEP Institute at Santa Clara University's Leavey School of Business, it requires passing three progressively advanced exams covering law, tax, accounting, and administration.",
    active: true
  },
  {
    id: "q097",
    question: "What made Starbucks' 'Bean Stock' program historically significant for equity compensation?",
    choices: [
      "Launched in 1991, Bean Stock was one of the first programs to give broad-based equity (RSU-like awards) to ALL employees including part-time hourly workers",
      "Bean Stock was the first ESPP in the food service industry, launched at Starbucks' 1992 IPO",
      "Bean Stock granted stock options only to store managers, setting a precedent for supervisor-level equity",
      "Bean Stock was a performance equity program tied exclusively to individual store sales targets"
    ],
    correctIndex: 0,
    category: "Fun / Industry Culture",
    difficulty: "medium",
    explanation: "Starbucks launched Bean Stock in 1991 — one of the earliest and most famous examples of broad-based equity for ALL employees, including part-time hourly workers (called 'partners'). CEO Howard Schultz believed all employees should share in the company's success. As Starbucks grew dramatically in the 1990s, many long-tenured hourly workers built meaningful wealth through Bean Stock.",
    active: true
  },
  {
    id: "q098",
    question: "What is a 'paper millionaire' in the equity compensation world?",
    choices: [
      "Someone whose theoretical net worth exceeds $1 million on paper from unvested or illiquid equity, but who cannot yet access that wealth",
      "A financial planner who specializes in equity compensation tax strategies for high-net-worth employees",
      "An executive who receives equity grants with a face value of $1M+ but a much lower Black-Scholes fair value",
      "An employee who requests equity compensation in writing rather than through an automated portal"
    ],
    correctIndex: 0,
    category: "Fun / Industry Culture",
    difficulty: "easy",
    explanation: "A 'paper millionaire' has significant wealth on paper — typically from unvested equity, unexercised options, or shares locked up at a private company — but cannot access the cash. The gap between paper wealth and real liquidity is a defining tension in startup equity culture, especially for employees waiting for an IPO or acquisition that may never materialize.",
    active: true
  },
  {
    id: "q099",
    question: "What was notable about Google's approach to its 2004 IPO that was unusual for a tech company of its size?",
    choices: [
      "Google used a Dutch auction process intended to democratize share access for ordinary investors, rather than the traditional investment bank book-building used by most IPOs",
      "Google prohibited all employees from selling shares for 5 years post-IPO as a retention mechanism",
      "Google granted every employee exactly 10,000 shares at the IPO price regardless of level or tenure",
      "Google's IPO was structured entirely as a direct listing — no new shares were sold to the public"
    ],
    correctIndex: 0,
    category: "Fun / Industry Culture",
    difficulty: "medium",
    explanation: "Google's August 2004 IPO was notable for using a Dutch auction process, allowing any investor (not just institutional buyers) to bid on shares at their chosen price. The IPO priced at $85 per share. Google had also broadly distributed equity to employees at all levels, creating a concentration of new millionaires in Silicon Valley when the stock quickly rose well beyond the IPO price.",
    active: true
  },
  {
    id: "q100",
    question: "In startup equity lore, what does it mean to 'hit the jackpot' on your options — and why doesn't it happen as often as people expect?",
    choices: [
      "Receiving life-changing equity proceeds at a major liquidity event — but most startups never IPO or achieve valuations that make employee options valuable after investor liquidation preferences",
      "Exercising all your options on the highest-price trading day of the year, a strategy that statistically beats the market",
      "Receiving an option repricing when your company's stock has fallen — rare because boards avoid repricing optics",
      "Having your options vest on the day of an acquisition announcement when the stock surges to its all-time high"
    ],
    correctIndex: 0,
    category: "Fun / Industry Culture",
    difficulty: "medium",
    explanation: "Most startup employees hope their equity will be life-changing, but the reality is sobering: the majority of venture-backed startups fail or return little. Even at 'successful' exits, common stockholder proceeds (employees) are often reduced by investor liquidation preferences, option pool dilution, and acquisition structures. The stories of WhatsApp and Google create a survivorship bias that makes equity seem more reliably valuable than it actually is.",
    active: true
  }
]

// Write each question to Firebase
let successCount = 0
let errorCount = 0

for (const q of newQuestions) {
  try {
    await set(ref(db, `questions/${q.id}`), q)
    console.log(`✓ ${q.id}: ${q.question.substring(0, 60)}...`)
    successCount++
  } catch (err) {
    console.error(`✗ ${q.id}: ${err.message}`)
    errorCount++
  }
}

console.log(`\nDone. ${successCount} questions written, ${errorCount} errors.`)
process.exit(0)
