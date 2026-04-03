// shared/common.js — 旅购通全局状态管理（基于 localStorage）
// 每个独立页面引入此文件即可访问完整状态和方法

const API = "http://localhost:3001";
const STORE_KEY = "lvgot_account";

// ---------- 默认状态 ----------
const DEFAULT_ACCOUNT = {
  accountNo: "LAK2026030003",
  name: "李四 (导游)",
  typeName: "导游",
  type: "guide",
  enterpriseType: "3", // 1=商户, 2=旅行社, 3=导游, 4+=其他
  level: 3,
  balance: 8560.00,
  frozenBalance: 0,
  status: "VALID",
  auditStatus: "not_required",
  livenessStatus: "passed",
  createTime: "2026-03-15 09:00:00",
  phone: "137****9003"
};

const DEFAULT_SPLIT_RECORDS = [
  { id: 1, merchant: "张三商行", status: "已分账", time: "今天 10:30", orderNo: "ORD20260326001", amount: 350.00 },
  { id: 2, merchant: "顺风旅行社", status: "已分账", time: "今天 09:15", orderNo: "ORD20260325002", amount: 560.00 },
  { id: 3, merchant: "张三商行", status: "待分账", time: "昨天 16:20", orderNo: "ORD20260325001", amount: 280.00 }
];

const DEFAULT_ORDER_LIST = [
  { id: 1, merchant: "张三商行", status: "已分账", time: "2026-03-26 10:30", orderNo: "ORD20260326001", amount: 350.00 },
  { id: 2, merchant: "顺风旅行社", status: "已分账", time: "2026-03-25 15:20", orderNo: "ORD20260325002", amount: 560.00 }
];

const DEFAULT_BANK_LIST = [
  { id: 1, bankName: "中国农业银行", bankAccountNo: "622202****0125", isDefault: true, bankIcon: "🏦" },
  { id: 2, bankName: "中国建设银行", bankAccountNo: "621700****9876", isDefault: false, bankIcon: "🏦" }
];

const DEFAULT_MESSAGES = [
  { id: 1, title: "分账成功通知", desc: "您有一笔350.00元的分账已到账，订单号：ORD20260326001", time: "今天 10:30", read: false },
  { id: 2, title: "账户升级提醒", desc: "您的账户已达到L3级别，享受更高分账额度", time: "2026-03-20 14:00", read: true },
  { id: 3, title: "门店绑定成功", desc: "商户号M123456已成功绑定到您的账户", time: "2026-03-15 09:00", read: true }
];

const DEFAULT_HELP_ITEMS = [
  { q: "如何进行分账？", a: "在分账页面点击「发起分账」，输入分账金额和收款方信息，通过安全验证后即可完成分账。" },
  { q: "充值多久到账？", a: "充值采用实时到账方式，一般在1分钟内完成。如超时未到账，请联系客服。" },
  { q: "提现需要手续费吗？", a: "提现手续费为提现金额的0.1%，最低1元/笔。" },
  { q: "如何升级账户等级？", a: "在「账户升级」页面完成人脸识别认证后，系统将自动评估并升级您的账户等级。" },
  { q: "商户号如何获取？", a: "商户号由拉卡拉分配，请联系您的客户经理获取，或在商户后台查看。" },
  { q: "分账限额是多少？", a: "L1账户单笔限额5000元，L2账户单笔限额20000元，L3账户单笔限额100000元。" }
];

const DEFAULT_WITHDRAW_FORM = {
  bankName: "中国农业银行",
  bankAccountNo: "622202****0125",
  amount: "",
  fee: 0,
  smsCode: "",
  payPassword: ""
};

// ---------- 状态读写工具 ----------
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveState(state) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
}

function getState() {
  const s = loadState();
  if (!s) {
    const init = {
      account: { ...DEFAULT_ACCOUNT },
      splitRecords: DEFAULT_SPLIT_RECORDS.map(r => ({ ...r })),
      orderList: DEFAULT_ORDER_LIST.map(r => ({ ...r })),
      bankList: DEFAULT_BANK_LIST.map(r => ({ ...r })),
      messages: DEFAULT_MESSAGES.map(r => ({ ...r })),
      helpItems: DEFAULT_HELP_ITEMS,
      withdrawForm: { ...DEFAULT_WITHDRAW_FORM },
      authType: "SMS",
      withdrawAuthType: "SMS",
      smsCountdown: 0
    };
    saveState(init);
    return init;
  }
  return s;
}

function patchState(fn) {
  const s = getState();
  fn(s);
  saveState(s);
}

// ---------- API 请求封装 ----------
async function apiRequest(path, body) {
  try {
    const r = await fetch(API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return await r.json();
  } catch (e) {
    return { code: -1, message: "网络请求失败" };
  }
}

// ---------- 通用业务方法 ----------
async function sendSmsCode(phone, onSuccess) {
  const state = getState();
  if (state.smsCountdown > 0) return;
  state.smsCountdown = 60;
  saveState(state);
  const d = await apiRequest("/api/sms/send", { phone: phone || "137****9003" });
  if (d.code === 0) {
    if (onSuccess) onSuccess();
    // 模拟倒计时
    const tick = () => {
      const s = loadState();
      if (!s) return;
      s.smsCountdown = Math.max(0, s.smsCountdown - 1);
      saveState(s);
      if (s.smsCountdown > 0) setTimeout(tick, 1000);
    };
    setTimeout(tick, 1000);
  }
  return d;
}

async function doSplitPay(splitForm, authType) {
  const body = {
    outOrderNo: "XC" + Date.now(),
    payerAccountNo: splitForm.payerAccountNo,
    amount: splitForm.amount,
    splitDetailList: (splitForm.receivers || []).map(r => ({ accountNo: r.accountNo, amount: r.amount }))
  };
  if (authType === "SMS") body.smsCode = splitForm.smsCode;
  if (authType === "PWD") body.payPassword = splitForm.payPassword;
  return apiRequest("/api/order/pay", body);
}

async function doWithdraw(form, authType, account) {
  const body = {
    accountNo: account.accountNo,
    amount: parseFloat(form.amount || 0),
    bankAccount: form.bankAccountNo,
    bankName: form.bankName
  };
  if (authType === "SMS") body.smsCode = form.smsCode;
  if (authType === "PWD") body.payPassword = form.payPassword;
  return apiRequest("/api/fund/withdraw", body);
}

async function startFaceAuth(account) {
  return apiRequest("/api/account/upgrade/apply", { accountNo: account.accountNo });
}

async function doBindTerminal(form, account) {
  return apiRequest("/api/store/bind_terminal", { ...form, accountNo: account.accountNo });
}

async function doRecharge(form) {
  return apiRequest("/api/fund/recharge", { accountNo: form.accountNo, amount: parseFloat(form.amount), payMethod: form.payMethod || "bankcard" });
}

async function doOpenAccount(form, type) {
  return apiRequest("/api/account/open", { ...form, type });
}

// 开户申请（调用 BFF 接口）
async function openAccount(form) {
  return apiRequest("/api/merchant/open-account", form);
}

// 权限判断
function canSplit(enterpriseType) {
  // 只有商户(1)和旅行社(2)可以分账
  return enterpriseType === "1" || enterpriseType === "2";
}

function canCreateTour(enterpriseType) {
  return canSplit(enterpriseType);
}

function canWithdraw(enterpriseType) {
  // 所有角色都可以提现
  return true;
}

function computeWithdrawFee(amount) {
  if (!amount || isNaN(amount)) return "0.00";
  return Math.max(1, Math.round(parseFloat(amount) * 0.001 * 100) / 100).toFixed(2);
}

// ---------- 暴露全局 ----------
window.__lvgot = {
  getState, patchState, saveState,
  sendSmsCode, doSplitPay, doWithdraw, startFaceAuth,
  doBindTerminal, doRecharge, doOpenAccount, openAccount,
  computeWithdrawFee,
  canSplit, canCreateTour, canWithdraw,
  API
};
