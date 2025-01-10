const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "http://10.169.142.40:8080",
    methods: ["GET", "POST"]
  }
});
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql');


const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'admin',
  database: 'colorgame_db'
});

connection.connect((error) => {
  if (error) throw error;
  console.log('Successfully connected to the database.');
});

app.use(cors());
app.use(bodyParser.json());

app.post('/login', (req, res) => {
  const employeeCode = req.body.empcode;
  const sqlQuery = 'SELECT * FROM user_account WHERE employee_code = ?';

  connection.query(sqlQuery, [employeeCode], (error, results) => {
    if (error) res.status(500).send(error);
    else if (results.length > 0) res.status(200).json({ token: 'fake-jwt-token', user: results[0] }); // Placeholder token
    else res.status(401).send('Invalid email or password');
  });
});


app.post('/update-money', (req, res) => {
  const { employeeCode, money } = req.body;

  if (!employeeCode || money === undefined) {
    res.status(400).send('Invalid request data');
    return;
  }

  const sqlQuery = 'UPDATE user_account SET current_money = ? WHERE employee_code = ?';

  connection.query(sqlQuery, [money, employeeCode], (error, results) => {
    if (error) {
      res.status(500).send(error);
    } else if (results.affectedRows > 0) {
      broadcastScoreboard();
      res.status(200).send('User money updated successfully');
    } else {
      res.status(404).send('User not found');
    }
  });
});

app.get('/get-ip-address', (req, res) => {  
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  res.json({ ip: ip });
});
app.post('/store-session-data', (req, res) => {
  const { employee_code, ip_address } = req.body;

  // First check if the user already exists in the database
  const checkExistsQuery = 'SELECT * FROM cw_session WHERE id = ?';

  connection.query(checkExistsQuery, [employee_code], (error, results) => {
    if (error) {
      res.status(500).send(error.message); // Send the error message for debugging
    } else if (results.length > 0) {
      // User already exists in the database, send an error response
      res.status(409).send('User already exists in the session table'); // 409 Conflict
    } else {
      // User does not exist, proceed with INSERT
      const sqlQuery = 'INSERT INTO cw_session (id, ip_add) VALUES (?, ?)';

      connection.query(sqlQuery, [employee_code, ip_address], (insertError, insertResults) => {
        if (insertError) {
          res.status(500).send(insertError.message); // Send the error message for debugging
        } else {
          res.status(200).send('Session data stored successfully');
        }
      });
    }
  });
});

app.post('/update-score', (req, res) => {
  const { employeeCode, newScore } = req.body;


  const sqlQuery = 'UPDATE user_account SET score = ? WHERE employee_code = ?';

  connection.query(sqlQuery, [newScore, employeeCode], (error, results) => {
    if (error) {
      res.status(500).send(error);
    } else if (results.affectedRows > 0) {
      broadcastScoreboard();
      res.status(200).send('User score updated successfully');
    } else {
      res.status(404).send('User not found');
    }
  });

});

function broadcastScoreboard() {
  const sqlQuery = 'SELECT * FROM user_account ORDER BY current_money DESC';

  connection.query(sqlQuery, (error, results) => {
    if (error) {
      console.error('Error fetching scoreboard:', error);
    } else {
      io.emit('scoreboardUpdate', results);
    }
  });
}

app.post('/add-money-to-all-players', (req, res) => {
  const amount = req.body.amount;

  // Assuming you have a predefined function to connect and execute MySQL queries
  const sqlQuery = 'UPDATE user_account SET current_money = current_money + ?';

  connection.query(sqlQuery, [amount], (error, results) => {
    if (error) {
      res.status(500).json({ message: "Failed to update all players' money.", error: error.message });
    } else {
      res.json({ message: "All players' money updated successfully." });

      // Now, query the updated scoreboard data from the MySQL database
      const getScoreboardQuery = 'SELECT * FROM user_account ORDER BY current_money DESC'; // Modify as needed
      connection.query(getScoreboardQuery, [], (scoreboardError, scoreboardResults) => {
        if (!scoreboardError) {
          // Emit the event to all connected clients
          io.emit('scoreboardUpdate', scoreboardResults);
        }
      });
    }
  });
});

io.on('connection', socket => {
  // console.log('a user connected');
  socket.on('requestScoreboard', () => {
    const sqlQuery = 'SELECT * FROM user_account ORDER BY current_money DESC';

    connection.query(sqlQuery, (error, results) => {
      if (error) {
        console.error('Error fetching scoreboard:', error);
      } else {
        io.emit('scoreboardUpdate', results);
      }
    });
  });
});

app.use(express.static('../dist'));
const PORT = process.env.PORT || 3333;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
