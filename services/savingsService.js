const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const SAVINGS_FILE = path.join(DATA_DIR, "savings_accounts.json");
const TRANSACTIONS_FILE = path.join(DATA_DIR, "transactions.json");

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SAVINGS_FILE)) {
    fs.writeFileSync(SAVINGS_FILE, JSON.stringify([]), "utf8");
  }
  if (!fs.existsSync(TRANSACTIONS_FILE)) {
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify([]), "utf8");
  }
}

function readSavingsAccounts() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(SAVINGS_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading savings accounts file:", err);
    return [];
  }
}

function writeSavingsAccounts(accounts) {
  ensureStorage();
  fs.writeFileSync(SAVINGS_FILE, JSON.stringify(accounts, null, 2), "utf8");
}

function readTransactions() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(TRANSACTIONS_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading transactions file:", err);
    return [];
  }
}

function writeTransactions(transactions) {
  ensureStorage();
  fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2), "utf8");
}

function generateAccountNumber() {
  const part1 = Math.floor(1000 + Math.random() * 9000);
  const part2 = Math.floor(1000 + Math.random() * 9000);
  return `AH-SAV-${part1}-${part2}`;
}

function generateTaxId() {
  const part1 = Math.floor(100 + Math.random() * 900);
  const part2 = Math.floor(10 + Math.random() * 90);
  const part3 = Math.floor(1000 + Math.random() * 9000);
  return `TIN-${part1}-${part2}-${part3}`;
}

function roundToCents(amount) {
  return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}

async function getOrCreateAccountForUser(user) {
  if (!user || !user.id) {
    throw new Error("Valid authenticated user required.");
  }

  const accounts = readSavingsAccounts();
  let account = accounts.find((a) => a.userId === user.id);

  if (!account) {
    const newAccount = {
      id: crypto.randomUUID(),
      userId: user.id,
      accountNumber: generateAccountNumber(),
      taxId: generateTaxId(),
      accountHolder: user.name || user.email.split("@")[0],
      email: user.email,
      balance: 1000.0, // Welcome starting bonus balance
      currency: "USD",
      interestRate: 4.5, // 4.5% APY
      taxWithholdingRate: 15.0, // 15% standard withholding tax on interest
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    accounts.push(newAccount);
    writeSavingsAccounts(accounts);

    // Record initial welcome deposit
    const initialTx = {
      id: crypto.randomUUID(),
      accountId: newAccount.id,
      userId: user.id,
      type: "DEPOSIT",
      grossAmount: 1000.0,
      taxAmount: 0.0,
      netAmount: 1000.0,
      balanceAfter: 1000.0,
      description: "Welcome Savings Account Activation Grant",
      timestamp: new Date().toISOString()
    };

    const txs = readTransactions();
    txs.push(initialTx);
    writeTransactions(txs);

    account = newAccount;
  }

  return account;
}

async function getAccountByUserId(userId) {
  const accounts = readSavingsAccounts();
  return accounts.find((a) => a.userId === userId) || null;
}

async function deposit({ userId, accountId, amount, description }) {
  const numAmount = roundToCents(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    const err = new Error("Please enter a valid deposit amount greater than $0.00");
    err.status = 400;
    throw err;
  }

  const accounts = readSavingsAccounts();
  const account = accounts.find((a) => a.id === accountId && (!userId || a.userId === userId));

  if (!account) {
    const err = new Error("Savings account not found or access unauthorized.");
    err.status = 404;
    throw err;
  }

  account.balance = roundToCents(account.balance + numAmount);
  account.lastActivity = new Date().toISOString();
  writeSavingsAccounts(accounts);

  const tx = {
    id: crypto.randomUUID(),
    accountId: account.id,
    userId: account.userId,
    type: "DEPOSIT",
    grossAmount: numAmount,
    taxAmount: 0.0,
    netAmount: numAmount,
    balanceAfter: account.balance,
    description: description && description.trim() ? description.trim() : "Standard Cash Deposit",
    timestamp: new Date().toISOString()
  };

  const txs = readTransactions();
  txs.push(tx);
  writeTransactions(txs);

  return { account, transaction: tx };
}

async function withdraw({ userId, accountId, amount, description }) {
  const numAmount = roundToCents(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    const err = new Error("Please enter a valid withdrawal amount greater than $0.00");
    err.status = 400;
    throw err;
  }

  const accounts = readSavingsAccounts();
  const account = accounts.find((a) => a.id === accountId && (!userId || a.userId === userId));

  if (!account) {
    const err = new Error("Savings account not found or access unauthorized.");
    err.status = 404;
    throw err;
  }

  if (account.balance < numAmount) {
    const err = new Error(`Insufficient funds. Current available balance is $${account.balance.toFixed(2)}.`);
    err.status = 400;
    throw err;
  }

  account.balance = roundToCents(account.balance - numAmount);
  account.lastActivity = new Date().toISOString();
  writeSavingsAccounts(accounts);

  const tx = {
    id: crypto.randomUUID(),
    accountId: account.id,
    userId: account.userId,
    type: "WITHDRAWAL",
    grossAmount: numAmount,
    taxAmount: 0.0,
    netAmount: numAmount,
    balanceAfter: account.balance,
    description: description && description.trim() ? description.trim() : "Standard Cash Withdrawal",
    timestamp: new Date().toISOString()
  };

  const txs = readTransactions();
  txs.push(tx);
  writeTransactions(txs);

  return { account, transaction: tx };
}

async function accrueInterestAndTax({ userId, accountId, customApy, customTaxRate }) {
  const accounts = readSavingsAccounts();
  const account = accounts.find((a) => a.id === accountId && (!userId || a.userId === userId));

  if (!account) {
    const err = new Error("Savings account not found or access unauthorized.");
    err.status = 404;
    throw err;
  }

  if (account.balance <= 0) {
    const err = new Error("Cannot calculate interest on a zero or negative balance.");
    err.status = 400;
    throw err;
  }

  const apy = Number(customApy || account.interestRate || 4.5);
  const taxRate = Number(customTaxRate || account.taxWithholdingRate || 15.0);

  // Monthly interest accrual calculation
  const monthlyRate = apy / 100 / 12;
  const grossInterest = roundToCents(account.balance * monthlyRate);

  if (grossInterest <= 0) {
    const err = new Error("Calculated interest is below minimum threshold of $0.01.");
    err.status = 400;
    throw err;
  }

  const taxWithheld = roundToCents(grossInterest * (taxRate / 100));
  const netInterest = roundToCents(grossInterest - taxWithheld);

  account.balance = roundToCents(account.balance + netInterest);
  account.lastActivity = new Date().toISOString();
  writeSavingsAccounts(accounts);

  const txs = readTransactions();

  // 1. Log Interest Credit
  const interestTx = {
    id: crypto.randomUUID(),
    accountId: account.id,
    userId: account.userId,
    type: "INTEREST",
    grossAmount: grossInterest,
    taxAmount: taxWithheld,
    netAmount: netInterest,
    balanceAfter: account.balance,
    description: `Monthly Interest Accrual (${apy}% APY) with ${taxRate}% Tax Withheld`,
    timestamp: new Date().toISOString()
  };
  txs.push(interestTx);

  writeTransactions(txs);

  return {
    account,
    calculation: {
      apy,
      taxRate,
      grossInterest,
      taxWithheld,
      netInterest,
      newBalance: account.balance
    },
    transaction: interestTx
  };
}

async function getAccountTransactions(accountId, filterType = "ALL") {
  const allTxs = readTransactions();
  let filtered = allTxs.filter((tx) => tx.accountId === accountId);

  if (filterType && filterType !== "ALL") {
    filtered = filtered.filter((tx) => tx.type === filterType);
  }

  // Sort newest first
  filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return filtered;
}

async function getTaxReport(accountId) {
  const accounts = readSavingsAccounts();
  const account = accounts.find((a) => a.id === accountId);

  if (!account) {
    const err = new Error("Account not found.");
    err.status = 404;
    throw err;
  }

  const txs = await getAccountTransactions(accountId, "ALL");

  let totalDeposited = 0;
  let totalWithdrawn = 0;
  let grossInterest = 0;
  let totalTaxWithheld = 0;
  let netInterest = 0;

  for (const tx of txs) {
    if (tx.type === "DEPOSIT") {
      totalDeposited += tx.netAmount || 0;
    } else if (tx.type === "WITHDRAWAL") {
      totalWithdrawn += tx.netAmount || 0;
    } else if (tx.type === "INTEREST") {
      grossInterest += tx.grossAmount || 0;
      totalTaxWithheld += tx.taxAmount || 0;
      netInterest += tx.netAmount || 0;
    }
  }

  return {
    accountId: account.id,
    accountNumber: account.accountNumber,
    taxId: account.taxId,
    accountHolder: account.accountHolder,
    email: account.email,
    currentBalance: roundToCents(account.balance),
    status: account.status,
    createdAt: account.createdAt,
    statementDate: new Date().toISOString(),
    taxYear: new Date().getFullYear(),
    taxWithholdingRate: account.taxWithholdingRate,
    summary: {
      totalDeposited: roundToCents(totalDeposited),
      totalWithdrawn: roundToCents(totalWithdrawn),
      grossInterest: roundToCents(grossInterest),
      totalTaxWithheld: roundToCents(totalTaxWithheld),
      netInterest: roundToCents(netInterest),
      taxableIncome: roundToCents(grossInterest),
      effectiveTaxRate: grossInterest > 0 ? roundToCents((totalTaxWithheld / grossInterest) * 100) : 0
    },
    transactionCount: txs.length
  };
}

async function lookupAccountByIdentification(identifier) {
  if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
    const err = new Error("Please enter an Account Number, Tax ID (TIN), or Registered Email to look up.");
    err.status = 400;
    throw err;
  }

  const query = identifier.trim().toLowerCase();
  const accounts = readSavingsAccounts();
  const account = accounts.find(
    (a) =>
      a.accountNumber.toLowerCase() === query ||
      a.taxId.toLowerCase() === query ||
      a.email.toLowerCase() === query
  );

  if (!account) {
    const err = new Error("No savings account found matching that Account Number, Tax ID, or Email.");
    err.status = 404;
    throw err;
  }

  const txs = await getAccountTransactions(account.id, "ALL");
  const taxSummary = await getTaxReport(account.id);

  // Return masked/verified public identity information
  return {
    found: true,
    account: {
      id: account.id,
      accountNumber: account.accountNumber,
      taxId: account.taxId,
      accountHolder: account.accountHolder,
      maskedEmail: account.email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + "*".repeat(Math.max(b.length, 3)) + c),
      balance: account.balance,
      interestRate: account.interestRate,
      taxWithholdingRate: account.taxWithholdingRate,
      status: account.status,
      createdAt: account.createdAt,
      lastActivity: account.lastActivity
    },
    taxSummary: taxSummary.summary,
    recentHistory: txs.slice(0, 5)
  };
}

module.exports = {
  getOrCreateAccountForUser,
  getAccountByUserId,
  deposit,
  withdraw,
  accrueInterestAndTax,
  getAccountTransactions,
  getTaxReport,
  lookupAccountByIdentification
};
