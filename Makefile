.PHONY: up up-vpn down re build logs api stream frontend

up:
	mkdir -p data/videos
	mkdir -p data/torrents
	docker compose up --build

re:
	rm -rf data
	$(MAKE) down
	$(MAKE) up

up-vpn:
	docker compose --profile vpn up --build

down:
	docker compose down -v

build:
	docker compose build

logs:
	docker compose logs -f

api:
	cd services/api && go run .

api-integration-test:
	cd services/api && go test -v -run IntegrationTest

stream:
	cd services/torrent-stream && go run .

frontend:
	cd frontend && npm run dev

tidy:
	cd services/api && go mod tidy
	cd services/torrent-stream && go mod tidy
