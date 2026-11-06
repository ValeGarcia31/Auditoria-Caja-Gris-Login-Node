const { Pool } = require("pg");
const config = require("./config.json");

const pool = new Pool({
    host: config.db_host,
    port: config.db_port,
    database: config.db_name,
    user: config.db_user,
    password: config.db_pass
});

module.exports = {
    query: (sql) => pool.query(sql),
    config,
    pool
};
