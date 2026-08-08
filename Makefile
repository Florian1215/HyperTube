####################################################### VARIABLE #######################################################
NAME		:=	hypertube
SRCS_D		:=	srcs
DATA_DIR	:=	data
COMPOSE_F	:=	$(SRCS_D)/docker-compose.yml
SERVICE		?=	#Leave blank

######################################################## FLAGS #########################################################
FLAGS		=	-f $(COMPOSE_F)
COMPOSE		=	docker compose
DSHELL		=	/bin/sh

######################################################## RULES #########################################################
.DEFAULT_GOAL = all

.PHONY: all
all			:	$(NAME)

$(NAME)		:
			mkdir -p $(DATA_DIR)
			$(COMPOSE) $(FLAGS) up --build $(SERVICE)

.PHONY: transcode
transcode:
			cd $(SRCS_D)/requirements/torrent-transcode && \
            set -a && source srcs/.env && set +a && \
            go build -o torrent-stream . && \
            ./torrent-stream

CMDS		:=	up build down ps ls images top
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

PHONY: fclean
fclean		: dusting
			$(COMPOSE) $(FLAGS) down -v --rmi all --remove-orphans
			rm -rf $(DATA_DIR)

.PHONY: dusting
dusting		:
			find . -path "*/migrations/*.py" -not -name "__init__.py" -delete
			find . -path "*/__pycache__/*" -delete
			find . -path "*/__pycache__" -delete

.PHONY: prune
prune		:
			docker system prune -af

.PHONY: sre
sre			:	clean all

.PHONY: re
re			:	fclean all
