CREATE TABLE IF NOT EXISTS tm_recuperacion (
  rec_id SERIAL PRIMARY KEY,
  usu_id INTEGER NOT NULL REFERENCES tm_usuario(usu_id),
  token_hash CHAR(64) NOT NULL,
  expira TIMESTAMP NOT NULL,
  usado INTEGER NOT NULL DEFAULT 0,
  fech_crea TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tm_recuperacion_token_hash ON tm_recuperacion(token_hash);
CREATE INDEX IF NOT EXISTS idx_tm_recuperacion_usu_id ON tm_recuperacion(usu_id);
