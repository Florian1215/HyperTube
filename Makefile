.PHONY: up up-vpn down build logs api stream frontend

up:
	mkdir -p data/videos
	mkdir -p data/torrents
	docker compose up --build

up-vpn:
	docker compose --profile vpn up --build

down:
	docker compose down

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


# ---------- VARIABLE ------------------------------------------------------------------------------------------------ #
NAME		:=	hypertube
#SRCS_D		:=	srcs todo move service to -> srcs/
#SECRETS_D	:=	secrets todo generate .env
#ENV_EXEMPLE	:=	.env_exemple todo generate .env
ENV_FILE	:=	.env
COMPOSE_F	:=	docker-compose.yml
SERVICE		?=	#Leave blank

# ---------- FLAGS --------------------------------------------------------------------------------------------------- #
FLAGS		=	-f $(COMPOSE_F)
COMPOSE		=	docker compose
DSHELL		=	/bin/sh

# ---------- RULES --------------------------------------------------------------------------------------------------- #
.DEFAULT_GOAL = all

.PHONY: all
all			:	$(NAME)

$(NAME)		:
			$(COMPOSE) $(FLAGS) up --build $(SERVICE)

CMDS		:=	up build down ps ls images events top
.PHONY: $(CMDS)
$(CMDS)		:
			$(COMPOSE) $(FLAGS) $@ $(SERVICE)

.PHONY: detach
detach		:
			$(COMPOSE) $(FLAGS) up --$@ $(SERVICE)

.PHONY: logs
logs		:	build
			$(COMPOSE) $(FLAGS) $@ -f $(SERVICE)

.PHONY: exec
exec		:
			$(COMPOSE) $(FLAGS) $@ $(SERVICE) $(DSHELL)

.PHONY: clean
clean		:
			$(COMPOSE) $(FLAGS) down --rmi local --remove-orphans

.PHONY: vclean
vclean		:
			$(COMPOSE) $(FLAGS) down -v --remove-orphans

.PHONY: fclean
fclean		:
			$(COMPOSE) $(FLAGS) down -v --rmi all --remove-orphans
			docker system prune -af

.PHONY: image-ls image-rm
image-ls	:
			docker image ls -a
image-rm	:
			docker image rm `docker image ls -qa`

.PHONY: container-ls container-rm
container-ls:
			docker container ls -a
container-rm:
			docker container rm `docker container ls -qa`

.PHONY: volume-ls volume-rm
volume-ls	:
			docker volume ls
volume-rm	:
			docker volume rm `docker volume ls -qa`

.PHONY: prune
prune		:
			docker system prune -af

.PHONY: sre vre re
sre			:	clean all
vre			:	vclean all
re			:	fclean all


# ---------- VARIABLE ------------------------------------------------------------------------------------------------ #
NAME		:=	hypertube
#SRCS_D		:=	srcs todo move service to -> srcs/
#SECRETS_D	:=	secrets todo generate .env
#ENV_EXEMPLE	:=	.env_exemple todo generate .env
ENV_FILE	:=	.env
COMPOSE_F	:=	docker-compose.yml
SERVICE		?=	#Leave blank

# ---------- FLAGS --------------------------------------------------------------------------------------------------- #
FLAGS		=	-f $(COMPOSE_F)
COMPOSE		=	docker compose
DSHELL		=	/bin/sh

# ---------- RULES --------------------------------------------------------------------------------------------------- #
.DEFAULT_GOAL = all

.PHONY: all
all			:	$(NAME)

$(NAME)		:
			$(COMPOSE) $(FLAGS) up --build $(SERVICE)

CMDS		:=	up build down ps ls images events top
.PHONY: $(CMDS)
$(CMDS)		:
			$(COMPOSE) $(FLAGS) $@ $(SERVICE)

.PHONY: detach
detach		:
			$(COMPOSE) $(FLAGS) up --$@ $(SERVICE)

.PHONY: logs
logs		:	build
			$(COMPOSE) $(FLAGS) $@ -f $(SERVICE)

.PHONY: exec
exec		:
			$(COMPOSE) $(FLAGS) $@ $(SERVICE) $(DSHELL)

.PHONY: clean
clean		:
			$(COMPOSE) $(FLAGS) down --rmi local --remove-orphans

.PHONY: vclean
vclean		:
			$(COMPOSE) $(FLAGS) down -v --remove-orphans

.PHONY: fclean
fclean		:
			$(COMPOSE) $(FLAGS) down -v --rmi all --remove-orphans
			docker system prune -af

.PHONY: image-ls image-rm
image-ls	:
			docker image ls -a
image-rm	:
			docker image rm `docker image ls -qa`

.PHONY: container-ls container-rm
container-ls:
			docker container ls -a
container-rm:
			docker container rm `docker container ls -qa`

.PHONY: volume-ls volume-rm
volume-ls	:
			docker volume ls
volume-rm	:
			docker volume rm `docker volume ls -qa`

.PHONY: prune
prune		:
			docker system prune -af

.PHONY: sre vre re
sre			:	clean all
vre			:	vclean all
re			:	fclean all
