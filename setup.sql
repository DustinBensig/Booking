USE gymnatorium;

CREATE TABLE IF NOT EXISTS bookings (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150)  NOT NULL,
    email       VARCHAR(150)  NOT NULL,
    phone       VARCHAR(50)   NOT NULL,
    event       VARCHAR(100)  NOT NULL,
    check_in    DATE          NOT NULL,
    check_out   DATE          NOT NULL,
    time_in     TIME          NULL,
    time_out    TIME          NULL,
    guests      INT           NOT NULL DEFAULT 0,
    days        INT           NOT NULL DEFAULT 1,
    created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inquiries (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150)  NOT NULL,
    email       VARCHAR(150)  NOT NULL,
    phone       VARCHAR(50)   NOT NULL,
    type        VARCHAR(100)  NOT NULL,
    message     TEXT          NOT NULL,
    created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);