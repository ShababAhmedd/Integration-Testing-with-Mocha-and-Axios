import "dotenv/config";
import axios from "axios";
import { expect } from "chai";

const baseURL = process.env.BASE_URL;
const partnerKey = "ROADTOSDET";
const password = "1234";
const OTP = "0000";

const api = axios.create({
  baseURL,
  validateStatus: () => true,
});

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomEmail() {
  return `shabab.ahmed2000sa+${randomInt(1000, 9999)}@gmail.com`;
}

function randomPhoneNumber() {
  return String(randomInt(10000000000, 99999999999));
}

function randomNid() {
  return String(randomInt(10000000, 99999999));
}

function randomName() {
  return `Test User ${randomInt(1000, 9999)}`;
}

function authHeaders(token) {
  return {
    Authorization: `bearer ${token}`,
    "X-AUTH-SECRET-KEY": partnerKey,
  };
}

function createUser({ email, phone, nid, role }, token) {
  return api.post(
    "/user/create",
    {
      name: randomName(),
      email,
      password,
      phone_number: phone,
      nid,
      role,
    },
    { headers: authHeaders(token) }
  );
}

function activateUser(id, token) {
  return api.patch(
    `/user/update/${id}`,
    { status: "active" },
    { headers: authHeaders(token) }
  );
}

function login(identifier, pass = password, useDevEnv = true) {
  return api.post(`/user/login${useDevEnv ? "?env=dev" : ""}`, {
    email: identifier,
    password: pass,
  });
}

function verifyOtp(identifier, otp, useDevEnv = true) {
  return api.post(`/user/verify-otp${useDevEnv ? "?env=dev" : ""}`, {
    identifier,
    otp,
  });
}

describe("Dmoney Integration Flow", function () {
  this.timeout(20000);

  let adminToken;

  let customer1ID, customerEmail1, customerPhoneNumber1;
  let customer2ID, customerEmail2, customerPhoneNumber2;
  let customer3ID, customerEmail3, customerPhoneNumber3;
  let customer1Token, customer2Token;

  let agentID, agentEmail, agentPhoneNumber, agentToken;
  let agent2ID, agentEmail2, agentPhoneNumber2, agent2Token;

  let merchantID, merchantEmail, merchantPhoneNumber;

  let systemToken;

  describe("Admin Login", () => {
    it("logs in with email", async () => {
      const res = await login("admin@dmoney.com");

      expect(res.status).to.equal(200);
      expect(res.data.message).to.equal("Login successful");
      expect(res.data.role).to.equal("Admin");

      adminToken = res.data.token;
    });

    it("logs in with phone number", async () => {
      const res = await login("01686606909");

      expect(res.status).to.equal(200);
      expect(res.data.message).to.equal("Login successful");
      expect(res.data.role).to.equal("Admin");

      adminToken = res.data.token;
    });
  });

  describe("User Creation Validation", () => {
    it("rejects creating a user outside the permitted role", async () => {
      const res = await createUser(
        {
          email: randomEmail(),
          phone: randomPhoneNumber(),
          nid: randomNid(),
          role: "Driver",
        },
        adminToken
      );

      expect(res.status).to.equal(400);
      expect(res.data.message).to.contain(
        "Invalid role: Driver. This role does not exist in the Role table."
      );
    });

    it("rejects a non gmail email", async () => {
      const res = await createUser(
        {
          email: "mashrur@safir.com",
          phone: randomPhoneNumber(),
          nid: randomNid(),
          role: "Customer",
        },
        adminToken
      );

      expect(res.status).to.equal(400);
      expect(res.data.message).to.equal(
        "Only Gmail addresses (@gmail.com) are allowed."
      );
    });

    it("rejects a non bangladeshi standard phone number", async () => {
      const res = await createUser(
        {
          email: "mashrur.safir@gmail.com",
          phone: String(randomInt(100000000000, 999999999999)),
          nid: randomNid(),
          role: "Customer",
        },
        adminToken
      );

      expect(res.status).to.equal(400);
      expect(res.data.message).to.equal(
        '"phone_number" length must be less than or equal to 11 characters long'
      );
    });

    it("rejects a user with one missing field", async () => {
      const res = await createUser(
        {
          email: "something@gmail.com",
          phone: "12345678901",
          nid: "",
          role: "Customer",
        },
        adminToken
      );

      expect(res.status).to.equal(400);
      expect(res.data.message).to.equal('"nid" is not allowed to be empty');
    });
  });

  describe("Customer 1 & Customer 2 Setup", () => {
    it("creates Customer 1", async () => {
      customerEmail1 = randomEmail();
      customerPhoneNumber1 = randomPhoneNumber();

      const res = await createUser(
        {
          email: customerEmail1,
          phone: customerPhoneNumber1,
          nid: randomNid(),
          role: "Customer",
        },
        adminToken
      );

      expect(res.status).to.equal(201);
      expect(res.data.message).to.equal("User created");
      expect(res.data.user.role).to.equal("Customer");

      customer1ID = res.data.user.id;
    });

    it("rejects creating Customer 1 again with the same phone number", async () => {
      const res = await createUser(
        {
          email: randomEmail(),
          phone: customerPhoneNumber1,
          nid: randomNid(),
          role: "Customer",
        },
        adminToken
      );

      expect(res.status).to.equal(208);
      expect(res.data.message).to.equal("User already exists");
    });

    it("rejects creating a customer with the same email", async () => {
      const res = await createUser(
        {
          email: customerEmail1,
          phone: randomPhoneNumber(),
          nid: randomNid(),
          role: "Customer",
        },
        adminToken
      );

      expect(res.status).to.equal(208);
      expect(res.data.message).to.equal("User already exists");
    });

    it("activates Customer 1", async () => {
      const res = await activateUser(customer1ID, adminToken);

      expect(res.status).to.equal(200);
      expect(res.data.message).to.equal("User updated successfully");
      expect(res.data.user.status).to.equal("active");
    });

    it("creates Customer 2", async () => {
      customerEmail2 = randomEmail();
      customerPhoneNumber2 = randomPhoneNumber();

      const res = await createUser(
        {
          email: customerEmail2,
          phone: customerPhoneNumber2,
          nid: randomNid(),
          role: "Customer",
        },
        adminToken
      );

      expect(res.status).to.equal(201);
      expect(res.data.message).to.equal("User created");
      expect(res.data.user.role).to.equal("Customer");

      customer2ID = res.data.user.id;
    });

    it("activates Customer 2", async () => {
      const res = await activateUser(customer2ID, adminToken);

      expect(res.status).to.equal(200);
      expect(res.data.message).to.equal("User updated successfully");
      expect(res.data.user.status).to.equal("active");
    });
  });

  describe("Agent Setup & Permissions", () => {
    it("creates an Agent", async () => {
      agentEmail = randomEmail();
      agentPhoneNumber = randomPhoneNumber();

      const res = await createUser(
        {
          email: agentEmail,
          phone: agentPhoneNumber,
          nid: randomNid(),
          role: "Agent",
        },
        adminToken
      );

      expect(res.status).to.equal(201);
      expect(res.data.message).to.equal("User created");
      expect(res.data.user.role).to.equal("Agent");

      agentID = res.data.user.id;
    });

    it("logs the Agent in and triggers an OTP", async () => {
      const res = await login(agentEmail);

      expect(res.status).to.equal(200);
      expect(res.data.message).to.equal(
        "OTP sent to your registered email address"
      );
      expect(res.data.otpRequired).to.equal(true);
    });

    it("verifies the Agent OTP", async () => {
      const res = await verifyOtp(agentEmail, OTP);

      expect(res.status).to.equal(200);
      expect(res.data.message).to.equal("Login successful");
      expect(res.data.role).to.equal("Agent");

      agentToken = res.data.token;
    });

    it("prevents the Agent from activating itself", async () => {
      const res = await activateUser(agentID, agentToken);

      expect(res.status).to.equal(200);
      expect(res.data.user).to.not.have.property("status");
    });

    it("prevents the Agent from changing its own role", async () => {
      const res = await api.patch(
        `/user/update/${agentID}`,
        { role: "admin" },
        { headers: authHeaders(agentToken) }
      );

      expect(res.status).to.equal(200);
      expect(res.data.user).to.not.have.property("role");
    });

    it("activates the Agent as Admin", async () => {
      const res = await activateUser(agentID, adminToken);

      expect(res.status).to.equal(200);
      expect(res.data.message).to.equal("User updated successfully");
      expect(res.data.user.status).to.equal("active");
    });
  });

  describe("Merchant Setup", () => {
    it("creates a Merchant", async () => {
      merchantEmail = randomEmail();
      merchantPhoneNumber = randomPhoneNumber();

      const res = await createUser(
        {
          email: merchantEmail,
          phone: merchantPhoneNumber,
          nid: randomNid(),
          role: "Merchant",
        },
        adminToken
      );

      expect(res.status).to.equal(201);
      expect(res.data.message).to.equal("User created");
      expect(res.data.user.role).to.equal("Merchant");

      merchantID = res.data.user.id;
    });

    it("prevents an Agent from activating another account", async () => {
      const res = await activateUser(merchantID, agentToken);

      expect(res.status).to.equal(403);
      expect(res.data.message).to.equal(
        "You can only update your own account"
      );
    });

    it("activates the Merchant as Admin", async () => {
      const res = await activateUser(merchantID, adminToken);

      expect(res.status).to.equal(200);
      expect(res.data.message).to.equal("User updated successfully");
      expect(res.data.user.status).to.equal("active");
    });
  });

  describe("SYSTEM Deposits", () => {
    it("logs the SYSTEM account in", async () => {
      const res = await login("system@dmoney.com");

      expect(res.status).to.equal(200);
      expect(res.data.message).to.equal("Login successful");
      expect(res.data.role).to.equal("Agent");

      systemToken = res.data.token;
    });

    it("deposits from SYSTEM to the Agent", async () => {
      const res = await api.post(
        "/transaction/deposit",
        {
          from_account: "SYSTEM",
          to_account: agentPhoneNumber,
          amount: 5000,
        },
        { headers: authHeaders(systemToken) }
      );

      expect(res.status).to.equal(201);
      expect(res.data.message).to.equal("SYSTEM deposit to Agent successful");
      expect(res.data.amount).to.equal(5000);
    });

    it("rejects a SYSTEM deposit to a Customer", async () => {
      const res = await api.post(
        "/transaction/deposit",
        {
          from_account: "SYSTEM",
          to_account: customerPhoneNumber1,
          amount: 5000,
        },
        { headers: authHeaders(systemToken) }
      );

      expect(res.status).to.equal(400);
      expect(res.data.message).to.equal(
        "SYSTEM account can only deposit to a regular Agent account. Customer and Merchant accounts are not allowed."
      );
    });

    it("rejects a SYSTEM deposit larger than its own balance", async () => {
      const res = await api.post(
        "/transaction/deposit",
        {
          from_account: "SYSTEM",
          to_account: agentPhoneNumber,
          amount: 1e200,
        },
        { headers: authHeaders(systemToken) }
      );

      expect(res.status).to.equal(208);
      expect(res.data.message).to.equal("SYSTEM account has insufficient balance");
    });
  });

  describe("Agent Deposits", () => {
    it("deposits from the Agent to Customer 1", async () => {
      const res = await api.post(
        "/transaction/deposit",
        {
          from_account: agentPhoneNumber,
          to_account: customerPhoneNumber1,
          amount: 2000,
        },
        { headers: authHeaders(agentToken) }
      );

      expect(res.status).to.equal(201);
      expect(res.data.message).to.equal("Deposit successful");
      expect(res.data.commission).to.equal(50);
    });

    it("rejects a deposit below the lower bound", async () => {
      const res = await api.post(
        "/transaction/deposit",
        {
          from_account: agentPhoneNumber,
          to_account: customerPhoneNumber1,
          amount: 9,
        },
        { headers: authHeaders(agentToken) }
      );

      expect(res.status).to.equal(400);
      expect(res.data.message).to.equal(
        "Minimum deposit amount is 10 tk and maximum deposit amount is 10000 tk"
      );
    });

    it("rejects a deposit above the upper bound", async () => {
      const res = await api.post(
        "/transaction/deposit",
        {
          from_account: agentPhoneNumber,
          to_account: customerPhoneNumber1,
          amount: 10001,
        },
        { headers: authHeaders(agentToken) }
      );

      expect(res.status).to.equal(400);
      expect(res.data.message).to.equal(
        "Minimum deposit amount is 10 tk and maximum deposit amount is 10000 tk"
      );
    });

    it("creates Customer 3", async () => {
      customerEmail3 = randomEmail();
      customerPhoneNumber3 = randomPhoneNumber();

      const res = await createUser(
        {
          email: customerEmail3,
          phone: customerPhoneNumber3,
          nid: randomNid(),
          role: "Customer",
        },
        adminToken
      );

      expect(res.status).to.equal(201);
      expect(res.data.message).to.equal("User created");
      expect(res.data.user.role).to.equal("Customer");

      customer3ID = res.data.user.id;
    });

    it("rejects a deposit to a pending (inactive) Customer 3", async () => {
      const res = await api.post(
        "/transaction/deposit",
        {
          from_account: agentPhoneNumber,
          to_account: customerPhoneNumber3,
          amount: 2000,
        },
        { headers: authHeaders(agentToken) }
      );

      expect(res.status).to.equal(403);
      expect(res.data.message).to.equal(
        "To account is not active. Please contact admin."
      );
    });
  });

  describe("Agent 2 Setup", () => {
    it("creates Agent 2", async () => {
      agentEmail2 = randomEmail();
      agentPhoneNumber2 = randomPhoneNumber();

      const res = await createUser(
        {
          email: agentEmail2,
          phone: agentPhoneNumber2,
          nid: randomNid(),
          role: "Agent",
        },
        adminToken
      );

      expect(res.status).to.equal(201);
      expect(res.data.message).to.equal("User created");
      expect(res.data.user.role).to.equal("Agent");

      agent2ID = res.data.user.id;
    });

    it("activates Agent 2", async () => {
      const res = await activateUser(agent2ID, adminToken);

      expect(res.status).to.equal(200);
      expect(res.data.message).to.equal("User updated successfully");
      expect(res.data.user.status).to.equal("active");
    });

    it("logs Agent 2 in and triggers an OTP", async () => {
      const res = await login(agentEmail2);

      expect(res.status).to.equal(200);
      expect(res.data.message).to.equal(
        "OTP sent to your registered email address"
      );
      expect(res.data.otpRequired).to.equal(true);
    });

    it("verifies the Agent 2 OTP", async () => {
      const res = await verifyOtp(agentEmail2, OTP);

      expect(res.status).to.equal(200);
      expect(res.data.message).to.equal("Login successful");
      expect(res.data.role).to.equal("Agent");

      agent2Token = res.data.token;
    });

    it("rejects a deposit from Agent 2 above its own balance", async () => {
      const res = await api.post(
        "/transaction/deposit",
        {
          from_account: agentPhoneNumber2,
          to_account: customerPhoneNumber1,
          amount: 10000,
        },
        { headers: authHeaders(agent2Token) }
      );

      expect(res.status).to.equal(208);
      expect(res.data.message).to.equal("Insufficient balance");
    });
  });

  describe("Customer 1 Login & OTP", () => {
    it("logs Customer 1 in and triggers an OTP", async () => {
      const res = await login(customerEmail1);

      expect(res.status).to.equal(200);
      expect(res.data.message).to.equal(
        "OTP sent to your registered email address"
      );
      expect(res.data.otpRequired).to.equal(true);
    });

    it("rejects a login with the wrong password", async () => {
      const res = await login(customerEmail1, "password");

      expect(res.status).to.equal(401);
      expect(res.data.message).to.equal("Password incorrect");
    });

    it("logs Customer 1 in without the dev bypass flag", async () => {
      const res = await login(customerEmail1, password, false);

      expect(res.status).to.equal(200);
      expect(res.data.message).to.equal(
        "OTP sent to your registered email address"
      );
      expect(res.data.otpRequired).to.equal(true);
    });

    it("rejects a wrong OTP outside the dev bypass flag", async () => {
      const res = await verifyOtp(customerEmail1, "1029", false);

      expect(res.status).to.equal(401);
      expect(res.data.message).to.equal("Invalid OTP. Please try again.");
    });

    it("verifies Customer 1's OTP", async () => {
      const res = await verifyOtp(customerEmail1, OTP);

      expect(res.status).to.equal(200);
      expect(res.data.message).to.equal("Login successful");
      expect(res.data.role).to.equal("Customer");

      customer1Token = res.data.token;
    });

    it("rejects verifying the same OTP a second time", async () => {
      const res = await verifyOtp(customerEmail1, OTP);

      expect(res.status).to.equal(400);
      expect(res.data.message).to.equal(
        "No OTP found. Please login again to request a new OTP."
      );
    });

    it("logs Customer 1 in again to request a fresh OTP", async () => {
      const res = await login(customerEmail1);

      expect(res.status).to.equal(200);
      expect(res.data.message).to.equal(
        "OTP sent to your registered email address"
      );
      expect(res.data.otpRequired).to.equal(true);
    });

    it("verifies Customer 1's fresh OTP", async () => {
      const res = await verifyOtp(customerEmail1, OTP);

      expect(res.status).to.equal(200);
      expect(res.data.message).to.equal("Login successful");
      expect(res.data.role).to.equal("Customer");

      customer1Token = res.data.token;
    });
  });

  describe("Send Money from Customer 1", () => {
    it("sends money from Customer 1 to Customer 2", async () => {
      const res = await api.post(
        "/transaction/sendmoney",
        {
          from_account: customerPhoneNumber1,
          to_account: customerPhoneNumber2,
          amount: 1000,
        },
        { headers: authHeaders(customer1Token) }
      );

      expect(res.status).to.equal(201);
      expect(res.data.message).to.equal("Send money successful");
      expect(res.data.fee).to.equal(5);
    });

    it("rejects sending money from a Customer to an Agent", async () => {
      const res = await api.post(
        "/transaction/sendmoney",
        {
          from_account: customerPhoneNumber1,
          to_account: agentPhoneNumber,
          amount: 1000,
        },
        { headers: authHeaders(customer1Token) }
      );

      expect(res.status).to.equal(400);
      expect(res.data.message).to.equal(
        "Send money is only allowed between two Customer accounts"
      );
    });

    it("rejects sending money above Customer 1's balance", async () => {
      const res = await api.post(
        "/transaction/sendmoney",
        {
          from_account: customerPhoneNumber1,
          to_account: customerPhoneNumber2,
          amount: 10000000,
        },
        { headers: authHeaders(customer1Token) }
      );

      expect(res.status).to.equal(208);
      expect(res.data.message).to.equal("Insufficient balance");
    });

    it("rejects sending money to your own account", async () => {
      const res = await api.post(
        "/transaction/sendmoney",
        {
          from_account: customerPhoneNumber1,
          to_account: customerPhoneNumber1,
          amount: 100,
        },
        { headers: authHeaders(customer1Token) }
      );

      expect(res.status).to.equal(400);
      expect(res.data.message).to.equal(
        "From account and to account cannot be the same"
      );
    });
  });

  describe("Customer 2 Login, Cash Out & Payment", () => {
    it("logs Customer 2 in and triggers an OTP", async () => {
      const res = await login(customerEmail2);

      expect(res.status).to.equal(200);
      expect(res.data.message).to.equal(
        "OTP sent to your registered email address"
      );
      expect(res.data.otpRequired).to.equal(true);
    });

    it("verifies Customer 2's OTP", async () => {
      const res = await verifyOtp(customerEmail2, OTP);

      expect(res.status).to.equal(200);
      expect(res.data.message).to.equal("Login successful");
      expect(res.data.role).to.equal("Customer");

      customer2Token = res.data.token;
    });

    it("cashes out from Customer 2 to the Agent", async () => {
      const res = await api.post(
        "/transaction/withdraw",
        {
          from_account: customerPhoneNumber2,
          to_account: agentPhoneNumber,
          amount: 500,
        },
        { headers: authHeaders(customer2Token) }
      );

      expect(res.status).to.equal(201);
      expect(res.data.message).to.equal("Withdraw successful");
      expect(res.data.fee).to.equal(5);
    });

    it("rejects a cash out to a non-agent account", async () => {
      const res = await api.post(
        "/transaction/withdraw",
        {
          from_account: customerPhoneNumber2,
          to_account: customerPhoneNumber1,
          amount: 500,
        },
        { headers: authHeaders(customer2Token) }
      );

      expect(res.status).to.equal(400);
      expect(res.data.message).to.equal("To Account is not agent account");
    });

    it("rejects a cash out above Customer 2's balance", async () => {
      const res = await api.post(
        "/transaction/withdraw",
        {
          from_account: customerPhoneNumber2,
          to_account: agentPhoneNumber,
          amount: 5999999999999999,
        },
        { headers: authHeaders(customer2Token) }
      );

      expect(res.status).to.equal(208);
      expect(res.data.message).to.equal("Insufficient balance");
    });

    it("pays from Customer 2 to the Merchant", async () => {
      const res = await api.post(
        "/transaction/payment",
        {
          from_account: customerPhoneNumber2,
          to_account: merchantPhoneNumber,
          amount: 400,
        },
        { headers: authHeaders(customer2Token) }
      );

      expect(res.status).to.equal(201);
      expect(res.data.message).to.equal("Payment successful");
      expect(res.data.fee).to.equal(5);
    });

    it("rejects a payment to a non-merchant account", async () => {
      const res = await api.post(
        "/transaction/payment",
        {
          from_account: customerPhoneNumber2,
          to_account: customerPhoneNumber1,
          amount: 400,
        },
        { headers: authHeaders(customer2Token) }
      );

      expect(res.status).to.equal(400);
      expect(res.data.message).to.equal(
        "From A/C should be customer or agent and To A/C should be merchant type"
      );
    });

    it("rejects initiating a transaction from another account's token", async () => {
      const res = await api.post(
        "/transaction/sendmoney",
        {
          from_account: customerPhoneNumber2,
          to_account: customerPhoneNumber1,
          amount: 100,
        },
        { headers: authHeaders(customer1Token) }
      );

      expect(res.status).to.equal(403);
      expect(res.data.message).to.equal(
        "Unauthorized: you can only initiate transactions from your own account"
      );
    });
  });
});
