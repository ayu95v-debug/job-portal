// const mysql = require("mysql");

// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "Ayush123",      // apna MySQL password
//   database: "job_portal"
// });

// db.connect(err => {
//   if (err) {
//     console.log("DB Error:", err);
//   } else {
//     console.log("MySQL Connected");
//   }
// });

// module.exports = db;

const mysql = require("mysql2");
const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_PUBLIC_URL;

const hasDbConfig =
  Boolean(databaseUrl) ||
  Boolean(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);

function getCallback(args) {
  for (let i = args.length - 1; i >= 0; i -= 1) {
    if (typeof args[i] === "function") return args[i];
  }
  return null;
}

if (!hasDbConfig) {
  const configError = new Error(
    "Database config missing. Add DATABASE_URL or MYSQL_PUBLIC_URL in backend/.env"
  );
  console.error("DB Error:", configError.message);

  module.exports = {
    query: (...args) => {
      const callback = getCallback(args);
      if (callback) process.nextTick(() => callback(configError));
    },
  };
} else {
  const dbConfig = databaseUrl
    ? databaseUrl
    : {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        connectTimeout: 10000,
      };

  const db = mysql.createConnection(dbConfig);
  const originalQuery = db.query.bind(db);

  db.query = (...args) => {
    const callback = getCallback(args);
    if (db.connectionError && callback) {
      process.nextTick(() => callback(db.connectionError));
      return undefined;
    }
    return originalQuery(...args);
  };

  db.connect((err) => {
    if (err) {
      db.connectionError = err;
      console.error("DB Error:", err);
    } else {
      console.log("MySQL Connected");
    }
  });

  module.exports = db;
}
