<template>
  <div id="main-container">
    <div id="game-container">
      <div id="main-container">
        <div id="user-money-display" style="display: flex; align-items: baseline">
          <h3 style="margin: 0; font-size: 1.5em">Your Money:</h3>
          <h2 style="margin: 0 0 0 10px">${{ loggedInEmployeeData.current_money }}</h2>
        </div>
      </div>
      <div id="box-container">
        <div
          class="box"
          v-for="(color, index) in gameColors"
          :key="index"
          :style="{ backgroundColor: color }"
        >
          <span class="box-text">{{ color.toUpperCase() }}</span>
        </div>
      </div>

      <div style="margin-top: 20px">
        <p>Select a color:</p>
        <div
          class="box selection-box"
          v-for="color in colors"
          :key="color"
          :style="{ backgroundColor: color }"
          @click="selectColor(color)"
          :class="{ selected: selectedColor === color }"
        >
          {{ color.toUpperCase() }}
        </div>
      </div>
      <div style="margin-top: 20px">
        <p>Place your bet:</p>
        <input
          type="number"
          v-model="betAmount"
          placeholder="Enter bet amount"
          min="1"
          class="bet-input"
        />
        <button @click="placeBet" :disabled="!canBet" class="bet-button">
          Place Bet
        </button>
      </div>
    </div>
    <!-- Scoreboard is now beside the game-container -->
    <div id="scoreboard">
      <button @click="$router.push('store')"> Button </button>
      <h2>Scoreboard</h2>
      <ul>
        <li v-for="(score, index) in scoreboard" :key="score.employee_code">
          <span
            :class="{
              'nickname-highlight': score.nickname === loggedInEmployeeData.nickname,
            }"
          >
            <span v-if="index === 0" class="crown-icon">&#x1f451;</span>
            {{ score.nickname }}: ${{ score.current_money }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import Swal from "sweetalert2";
import io from "socket.io-client";
const socket = io("http://10.169.142.40:3333", {
  reconnectionDelayMax: 10000,
  auth: {
    token: "123",
  },
});
export default {
  name: "ColorBoxGame",
  data() {
    return {
      moneyAdditionInterval: null,
      scoreboard: [],
      loggedInEmployeeData: {},
      colors: ["green", "white", "red", "yellow", "blue", "pink"],
      isRandomizing: false,
      selectedColor: "",
      gameColors: Array(3).fill(""),
      betAmount: 0,
    };
  },
  async created() {
    if (!socket.connected) {
      socket.connect();
    }

    socket.on("connect", () => {
      console.log("Connected to server");
      // this.fetchloggedInEmployeeData.userMoney(employeeCode);
    });

    socket.emit("requestScoreboard");
    this.initializeScoreboard();

    // socket.on("scoreboardUpdate", (data) => {
    //   console.log("scoreboard update data: ", data);
    //   this.scoreboard = data;
    // });
  },
  mounted() {
    this.moneyAdditionInterval = setInterval(() => {
      this.addAllPlayersMoney(50);
    }, 600000); // 300000 ms is equal to 5 minutes
  },
  methods: {
    async addAllPlayersMoney(amountToAdd) {
      try {
        const response = await fetch(
          "http://10.169.142.40:3333/add-money-to-all-players",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ amount: amountToAdd }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        } else {
          console.log("All players' money updated successfully.");
          // Optionally, fetch the updated scoreboard if needed
          // this.fetchScoreboard();
        }
      } catch (error) {
        console.error("Failed to update all players' money:", error);
      }
    },
    initializeScoreboard() {
      socket.on("scoreboardUpdate", (data) => {
        console.log("scoreboard update data: ", data);
        this.scoreboard = data;
        this.fetchLoggedInEmployeeData();
      });
    },
    async fetchLoggedInEmployeeData() {
      const getLoggedInEmployeeCode = async () => {
        return new Promise((resolve, reject) => {
          // Open a connection to the IndexedDB
          const request = window.indexedDB.open("MyDatabase", 1);

          request.onerror = (event) => {
            // Handle errors when opening IndexedDB
            console.error("IndexedDB error:", event.target.error);
            reject(event.target.error);
          };

          request.onsuccess = (event) => {
            const db = event.target.result;
            // Transaction for the store where the logged-in employee's info is kept
            const transaction = db.transaction("employees", "readonly");
            const store = transaction.objectStore("employees");

            // You are using a specific key ("unique_key") to store the data
            const query = store.get(1);

            query.onsuccess = () => {
              const loggedInEmployee = query.result;
              if (loggedInEmployee) {
                // employee_code is the property where the code is stored
                resolve(loggedInEmployee.employee_code);
              } else {
                reject("No logged-in employee found.");
              }
            };

            query.onerror = (error) => {
              console.error("Error fetching logged-in employee code:", error);
              reject(error);
            };
          };
        });
      };

      try {
        const loggedInEmployeeCode = await getLoggedInEmployeeCode();
        const loggedInEmployeeData = this.scoreboard.find(
          (employee) => employee.employee_code == loggedInEmployeeCode
        );
        console.log("loggedInEmployeeCode", loggedInEmployeeCode);

        if (loggedInEmployeeData) {
          console.log("Logged-in employee data: ", loggedInEmployeeData);
          this.loggedInEmployeeData = loggedInEmployeeData;
        } else {
          console.log("Logged-in employee not found in scoreboard.");
        }
      } catch (error) {
        console.error(
          "Error fetching the logged-in employee's code from IndexedDB",
          error
        );
      }
    },
    placeBet() {
      if (this.canBet) {
        this.startRandomizing();
      } else {
        Swal.fire(
          "Invalid Bet",
          "Please enter a valid bet amount within your funds.",
          "error"
        );
      }
    },

    generateColors() {
      this.gameColors = this.gameColors.map(
        () => this.colors[Math.floor(Math.random() * this.colors.length)]
      );
    },
    startRandomizing() {
      this.isRandomizing = true;
      clearInterval(this.intervalId);
      this.intervalId = setInterval(this.generateColors, 100);

      setTimeout(() => {
        clearInterval(this.intervalId);
        this.isRandomizing = false;
        this.checkWinner();
      }, 3000);
    },
    selectColor(color) {
      this.selectedColor = color;
    },
    checkWinner() {
      const countSelectedColor = this.gameColors.filter(
        (color) => color === this.selectedColor
      ).length;
      let win = countSelectedColor > 0; // Any occurrence of the selected color is considered a win.
      let multiplier = 1;

      // Determine the multiplier based on the number of selected color occurrences.
      if (countSelectedColor === 3) {
        multiplier = 3;
      } else if (countSelectedColor === 2) {
        multiplier = 2;
      }

      if (win) {
        let winAmount = +this.betAmount * multiplier;
        this.loggedInEmployeeData.current_money += winAmount;
        Swal.fire(
          "Winner!",
          `Congratulations, you picked the right color! You've won ${winAmount}!`,
          "success"
        );
      } else {
        this.loggedInEmployeeData.current_money -= +this.betAmount;
        Swal.fire(
          "Loser!",
          `Sorry, you picked the wrong color: ${this.selectedColor}.`,
          "error"
        );
      }

      this.updateDatabase();

      this.selectedColor = "";
      this.betAmount = 0;
    },
    async updateDatabase() {
      try {
        const response = await fetch("http://10.169.142.40:3333/update-money", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employeeCode: this.loggedInEmployeeData.employee_code,
            money: this.loggedInEmployeeData.current_money,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        } else {
          console.log("Database updated successfully");
        }
      } catch (error) {
        console.error("Failed to update user money on the server:", error);
      }
    },
    beforeUnmount() {
      if (this.moneyAdditionInterval) {
        clearInterval(this.moneyAdditionInterval);
      }
    },
    beforeDestroy() {
      clearInterval(this.intervalId);
      if (this.socket) {
        this.socket.off("scoreboardUpdate");
        this.socket.disconnect();
      }
    },
  },
  computed: {
    canBet() {
      return (
        this.betAmount > 0 &&
        this.betAmount <= this.loggedInEmployeeData.current_money &&
        !this.isRandomizing
      );
    },
  },
  beforeUnmount() {
    socket.off("connect");
    socket.off("scoreboardUpdate");
  },
};
</script>

<style>
body {
  background-color: #eceff1;
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
}
.bet-input {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-right: 5px;
  font-size: 1rem;
}

.bet-button {
  padding: 10px 20px;
  background-color: #007bff;
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.bet-button:hover {
  background-color: #0056b3;
}

.bet-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

#main-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

#game-container {
  max-width: 80%;
}

.box {
  width: 100px;
  height: 100px;
  margin: 10px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  border: 2px solid #000;
  transition: background-color 0.1s;
  cursor: pointer;
  text-transform: uppercase;
}

.selection-box {
  opacity: 0.4;
}

.selected {
  opacity: 1;
  border: 3px solid #000;
}

#scoreboard {
  width: 200px; /* Adjust width as needed */
  margin-left: 20px;
  border: 1px solid #000;
  padding: 10px;
}

#scoreboard ul {
  list-style-type: none; /* Remove default list disc */
  padding-left: 0; /* Remove default padding */
}

#scoreboard li {
  padding: 2px 0; /* Optional: Add some padding to list items for better readability */
}

.nickname-highlight {
  color: green;
  font-weight: bold;
}
</style>
