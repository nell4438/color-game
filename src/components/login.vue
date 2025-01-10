<template>
  <div class="login-container">
    <div class="login-form">
      <h1>Login</h1>
      <form @submit.prevent="submitLoginForm">
        <div class="form-group">
          <label for="emp">Employee Code:</label>
          <input
            type="text"
            id="emp"
            v-model="loginData.employee_code"
            required
            autofocus
            autocomplete="off"
          />
        </div>
        <div class="form-actions">
          <button type="submit" class="login-button">Login</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
// import axios from "axios";
export default {
  name: "LoginForm",
  data() {
    return {
      loginData: {
        employee_code: "",
        // password: "",
      },
    };
  },
  methods: {
    getIPv4(ip) {
      return ip.includes("::ffff:") ? ip.split("::ffff:")[1] : ip;
    },
    async submitLoginForm() {
      try {
        await this.storeEmployeeCode(this.loginData.employee_code);
        console.log("Employee code stored in IndexedDB");
        const ipAddress = this.getIPv4(await this.getUserIpAddress());
        console.log("User IP address:", ipAddress);
        await this.storeUserIpAddressInDb(ipAddress);
        console.log("IP address stored in database");
      } catch (error) {
        console.error("An error occurred:", error);
      }
    },
    async getUserIpAddress() {
      // This could be a call to your backend or an external API
      // Example using fetch to your backend endpoint:
      const response = await fetch("http://10.169.142.40:3333/get-ip-address");
      if (!response.ok) {
        throw new Error("Could not fetch IP address");
      }
      const data = await response.json();
      return data.ip;
    },
    async storeUserIpAddressInDb(ipAddress) {
      const sessionData = {
        employee_code: this.loginData.employee_code,
        ip_address: ipAddress,
      };

      const response = await fetch("http://10.169.142.40:3333/store-session-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionData),
      });
      // console.log('ressss',response)
      if (response.status == 409) {
        alert("Already sign in");
        this.$router.push("/login");
      } else {
        this.$router.push("/dashboard");
      }
    },
    async storeEmployeeCode(employeeCode) {
      const db = await this.openDatabase();

      const transaction = db.transaction("employees", "readwrite");
      const store = transaction.objectStore("employees");

      return new Promise((resolve, reject) => {
        const request = store.put({ player_loggedin: true, employee_code: employeeCode });
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          reject("Error storing employee code in IndexedDB");
        };
      });
    },

    openDatabase() {
      return new Promise((resolve, reject) => {
        const dbName = "MyDatabase";
        const dbVersion = 1;


        const request = indexedDB.open(dbName, dbVersion);


        request.onerror = (event) => {
          console.error("Database error:", event.target.error.message);
          reject("Database error: " + event.target.errorCode);
        };

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains("employees")) {
            db.createObjectStore("employees", { keyPath: "id", autoIncrement: true });
          }
        };

        request.onsuccess = (event) => {
          console.log("Database opened successfully");
          resolve(event.target.result);
        };
      });
    },
  },
};
</script>
<style scoped>
* {
  box-sizing: border-box;
}

.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: calc(
    100vh - 20px
  ); /* Adjusted to account for potential additional browser UI */
  background: #eceff1;
  /* Other styles remain the same */
}

.login-form {
  width: 100%;
  max-width: 350px;
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.login-form h1 {
  font-size: 1.6rem;
  color: #333;
  margin-bottom: 2rem;
  text-align: center;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #616161;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  font-size: 1rem;
  color: #333;
  background: #fff;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #42a5f5;
}

.form-actions {
  text-align: center;
}

.login-button {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  color: #fff;
  background: #42a5f5;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.login-button:hover {
  background: #1e88e5;
}

.login-button:active {
  background: #1565c0;
}
</style>
