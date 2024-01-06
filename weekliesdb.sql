CREATE DATABASE IF NOT EXISTS njweeklies;
USE njweeklies;

CREATE TABLE player (
	username VARCHAR(20),
    discord_id VARCHAR(18) NOT NULL,
    mmr INT NOT NULL DEFAULT 1000,
    PRIMARY KEY (discord_id)
);