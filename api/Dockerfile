FROM golang:1.24

WORKDIR /app

COPY go.mod ./
RUN go mod download || true

COPY . ./
RUN go build -o /usr/local/bin/api ./cmd/server

EXPOSE 8080
CMD ["/usr/local/bin/api"]
