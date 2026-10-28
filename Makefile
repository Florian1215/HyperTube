####################################################### VARIABLE #######################################################
NAME		:=	hypertube
SRCS_D		:=	srcs
TRANSCODE_D	:=	$(SRCS_D)/requirements/transcode/
DATA_DIR	:=	medias
#COMPOSE_F	?=	$(SRCS_D)/docker-compose.yml
COMPOSE_F	?=	$(SRCS_D)/docker-compose.prod.yml
SERVICE		?=	#Leave blank
TAIL		?=	100
TV_D		:=	tv-app
TV_IP		?=	192.168.1.65:5555
TV_PACKAGE	:=	com.hypertube.tv
TV_APK		:=	$(TV_D)/app/build/outputs/apk/release/app-release.apk

######################################################## FLAGS #########################################################
FLAGS		=	-f $(COMPOSE_F)
COMPOSE		=	docker-compose
DSHELL		=	/bin/sh

######################################################## RULES #########################################################
.DEFAULT_GOAL = all

.PHONY: all
all			:	$(NAME)

$(NAME)		:
			mkdir -p $(DATA_DIR)
			mkdir -p $(DATA_DIR)/torrents
			mkdir -p $(DATA_DIR)/streams
			$(COMPOSE) $(FLAGS) up --build $(SERVICE)

.PHONY: tv
tv			:
			@test -f $(TV_D)/keystore.properties || { echo "Missing $(TV_D)/keystore.properties, see $(TV_D)/README.md (Release)"; exit 1; }
			adb connect $(TV_IP)
			cd $(TV_D) && ./gradlew assembleRelease
			adb -s $(TV_IP) install -r $(TV_APK)
			adb -s $(TV_IP) shell monkey -p $(TV_PACKAGE) -c android.intent.category.LEANBACK_LAUNCHER 1 > /dev/null 2>&1

.PHONY: transcode
transcode:
			cp srcs/.env $(TRANSCODE_D)
			cd $(TRANSCODE_D) && source .venv/bin/activate && flask --app app run

CMDS		:=	up build down ps ls images top
.PHONY: $(CMDS)
$(CMDS)		:
			$(COMPOSE) $(FLAGS) $@ $(SERVICE)

.PHONY: detach
detach		:
			$(COMPOSE) $(FLAGS) up --$@ $(SERVICE)

.PHONY: logs
logs		:	build
			$(COMPOSE) $(FLAGS) $@ -f --tail=$(TAIL) $(SERVICE)

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
			find . -path "*/__pycache__/*" -delete
			find . -path "*/__pycache__" -delete

.PHONY: dusting-migration
dusting-migration:
			find . -path "*/migrations/*.py" -not -name "__init__.py" -delete

.PHONY: prune
prune		:
			docker system prune -af

.PHONY: re
re			:	clean all

.PHONY: vre
vre			:	dusting-migration fclean all
