const authService = require("../services/authService");
const savingsService = require("../services/savingsService");

async function extractUser(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : req.headers["x-auth-token"];
  if (!token) return null;
  return await authService.getUserByToken(token);
}

async function getMyAccount(req, res, next) {
  try {
    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        error: "Please sign in to access your personal savings account."
      });
    }

    const account = await savingsService.getOrCreateAccountForUser(user);
    const taxReport = await savingsService.getTaxReport(account.id);
    const transactions = await savingsService.getAccountTransactions(account.id, "ALL");

    res.json({
      success: true,
      authenticated: true,
      account,
      taxSummary: taxReport.summary,
      transactions
    });
  } catch (err) {
    next(err);
  }
}

async function deposit(req, res, next) {
  try {
    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Please sign in to make a deposit into your savings account."
      });
    }

    const { amount, description, accountId } = req.body;
    let targetAccountId = accountId;

    if (!targetAccountId) {
      const acc = await savingsService.getOrCreateAccountForUser(user);
      targetAccountId = acc.id;
    }

    const result = await savingsService.deposit({
      userId: user.id,
      accountId: targetAccountId,
      amount,
      description
    });

    const taxReport = await savingsService.getTaxReport(result.account.id);

    res.json({
      success: true,
      message: `Successfully deposited $${Number(amount).toFixed(2)}`,
      account: result.account,
      transaction: result.transaction,
      taxSummary: taxReport.summary
    });
  } catch (err) {
    next(err);
  }
}

async function withdraw(req, res, next) {
  try {
    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Please sign in to withdraw funds from your savings account."
      });
    }

    const { amount, description, accountId } = req.body;
    let targetAccountId = accountId;

    if (!targetAccountId) {
      const acc = await savingsService.getOrCreateAccountForUser(user);
      targetAccountId = acc.id;
    }

    const result = await savingsService.withdraw({
      userId: user.id,
      accountId: targetAccountId,
      amount,
      description
    });

    const taxReport = await savingsService.getTaxReport(result.account.id);

    res.json({
      success: true,
      message: `Successfully withdrew $${Number(amount).toFixed(2)}`,
      account: result.account,
      transaction: result.transaction,
      taxSummary: taxReport.summary
    });
  } catch (err) {
    next(err);
  }
}

async function accrueInterest(req, res, next) {
  try {
    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Please sign in to calculate and apply interest & tax accruals."
      });
    }

    const { accountId, customApy, customTaxRate } = req.body;
    let targetAccountId = accountId;

    if (!targetAccountId) {
      const acc = await savingsService.getOrCreateAccountForUser(user);
      targetAccountId = acc.id;
    }

    const result = await savingsService.accrueInterestAndTax({
      userId: user.id,
      accountId: targetAccountId,
      customApy,
      customTaxRate
    });

    const taxReport = await savingsService.getTaxReport(result.account.id);

    res.json({
      success: true,
      message: `Interest compounded: +$${result.calculation.grossInterest.toFixed(2)} gross, -$${result.calculation.taxWithheld.toFixed(2)} tax withheld, +$${result.calculation.netInterest.toFixed(2)} net added.`,
      account: result.account,
      calculation: result.calculation,
      transaction: result.transaction,
      taxSummary: taxReport.summary
    });
  } catch (err) {
    next(err);
  }
}

async function getHistory(req, res, next) {
  try {
    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Please sign in to view your complete transaction history."
      });
    }

    const { filter = "ALL" } = req.query;
    const account = await savingsService.getOrCreateAccountForUser(user);
    const transactions = await savingsService.getAccountTransactions(account.id, filter);

    res.json({
      success: true,
      accountNumber: account.accountNumber,
      filter,
      transactions
    });
  } catch (err) {
    next(err);
  }
}

async function getTaxReport(req, res, next) {
  try {
    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Please sign in to generate your official tax statement."
      });
    }

    const account = await savingsService.getOrCreateAccountForUser(user);
    const taxReport = await savingsService.getTaxReport(account.id);

    res.json({
      success: true,
      taxReport
    });
  } catch (err) {
    next(err);
  }
}

async function lookupAccount(req, res, next) {
  try {
    const { identifier } = req.body;
    const result = await savingsService.lookupAccountByIdentification(identifier);
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyAccount,
  deposit,
  withdraw,
  accrueInterest,
  getHistory,
  getTaxReport,
  lookupAccount
};
