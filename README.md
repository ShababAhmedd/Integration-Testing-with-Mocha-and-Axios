# Integration Testing with Mocha and Axios

Integration test suite for the **Dmoney** API, built with Mocha, Chai, and Axios. It replays a full end-to-end financial-services flow — admin login, user/agent/merchant creation and activation, OTP verification, deposits, send money, cash-out, and payments — directly against a running Dmoney backend, based on a Postman collection ([collection/findme.json](collection/findme.json)).

## Technologies Used

- [Node.js](https://nodejs.org/)
- [Mocha](https://mochajs.org/) — test runner
- [Chai](https://www.chaijs.com/) — assertion library
- [Axios](https://axios-http.com/) — HTTP client for API calls

## Prerequisites

- Node.js and npm installed
- A running instance of the Dmoney API on `http://localhost:5000` (the base URL used by the tests in [dmoney.spec.js](dmoney.spec.js))

## Clone the Repository

```bash
git clone https://github.com/ShababAhmedd/Integration-Testing-with-Mocha-and-Axios.git
cd Integration-Testing-with-Mocha-and-Axios
```

## Install Dependencies

```bash
npm install
```

## Run the Tests

```bash
npm test
```

This runs `mocha dmoney.spec.js` with a 20-second timeout per test, executing the full integration flow against the Dmoney API.
