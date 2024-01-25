.DEFAULT_GOAL		:= interactive

DOCKER_IMAGE_ALIAS	:= exploreme
DOCKER_IMAGE_LOCAL	:= $(DOCKER_IMAGE_ALIAS)-graphql
DOCKER_IMAGE_PROD	:= $(DOCKER_IMAGE_ALIAS)-graphql-production

.PORT			:= 8081
.PORT_DEBUG		:= 9229

ifeq ($(shell uname), Darwin)
    # MacOS
    .DB_HOSTNAME := host.docker.internal
else ifeq ($(shell uname), Linux)
    # Linux
    .DB_HOSTNAME := $(shell hostname -I | cut -d ' ' -f 1)
else
    # Default for other systems (assuming Windows)
    .DB_HOSTNAME := host.docker.internal
endif

.DB_USERNAME	:= root
.DB_PASSWORD	:= password
.DB_NAME		:= explore
.DB_PORT		:= 3306
.DB_DIALECT		:= mysql

PORT			:= $(.PORT)
PORT_DEBUG		:= $(.PORT_DEBUG)
DB_HOSTNAME		:= $(.DB_HOSTNAME)
DB_USERNAME		:= $(.DB_USERNAME)
DB_PASSWORD		:= $(.DB_PASSWORD)
DB_PORT			:= $(.DB_PORT)
DB_NAME			:= $(.DB_NAME)
DB_DIALECT		:= $(.DB_DIALECT)

.SHARED_VOLUMES := \
	-v $(PWD)/build:/www/build \
	-v $(PWD)/config:/www/config \
	-v $(PWD)/database:/www/database \
	-v $(PWD)/sandbox:/www/sandbox \
	-v $(PWD)/src:/www/src \
	-v $(PWD)/var:/www/var \
	-v $(PWD)/.env:/www/.env \
	-v $(PWD)/.sequelizerc:/www/.sequelizerc \
	-v $(PWD)/jest.config.js:/www/jest.config.js \
	-v $(PWD)/tsconfig.json:/www/tsconfig.json

.ENV_VARIABLES := \
	-e PORT=$(PORT) \
 	-e DB_HOSTNAME=$(DB_HOSTNAME) \
 	-e DB_USERNAME=$(DB_USERNAME) \
 	-e DB_PASSWORD=$(DB_PASSWORD) \
 	-e DB_PORT=$(DB_PORT) \
 	-e DB_NAME=$(DB_NAME) \
 	-e DB_DIALECT=$(DB_DIALECT)

help:
	@echo ""
	@echo "-------------------------------------------------"
	@echo "--------- 'Explore Me' GraphQL back-end ---------"
	@echo "-------------------------------------------------"
	@echo ""
	@echo " make help\t\tdisplay help"
	@echo ""
	@echo "-- DOCKER IMAGE PREPARATION"
	@echo " make image-local\t\tbuild [$(DOCKER_IMAGE_LOCAL)] image, with encapsulate dependencies"
	@echo " make image-prod\tbuild [$(DOCKER_IMAGE_PROD)] image of node + apline [no NPM]"
	@echo ""
	@echo "-- COMMANDS"
	@echo " make\t\t\talias for 'make $(.DEFAULT_GOAL)'"
	@echo " make interactive\trun [$(DOCKER_IMAGE_LOCAL)] image, content become available on http://localhost:$(PORT) with debugger on $(PORT) port"
	@echo " make serve\t\trun [$(DOCKER_IMAGE_PROD)] image, content become available on http://localhost:$(PORT)"
	@echo " make test\t\texecute unit and functional tests"
	@echo " make build\t\tgenerate static assets in './build' directory"
	@echo ""
	@echo "-- ARGUMENTS"
	@echo " argument\t\tdefault"
	@echo " PORT:\t\t\t$(.PORT)"
	@echo " PORT_DEBUG:\t\t$(.PORT_DEBUG)"
	@echo " DB_HOSTNAME:\t\t$(.DB_HOSTNAME)"
	@echo " DB_USERNAME:\t\t$(.DB_USERNAME)"
	@echo " DB_PASSWORD:\t\t$(.DB_PASSWORD)"
	@echo " DB_PORT:\t\t$(.DB_PORT)"
	@echo " DB_NAME:\t\t$(.DB_NAME)"
	@echo " DB_DIALECT:\t\t$(.DB_DIALECT)"
	@echo ""

image-base:
	docker build .

image-local: image-base
	docker build -t $(DOCKER_IMAGE_LOCAL) . -f env.local.Dockerfile

image-prod: image-base
	docker build -t $(DOCKER_IMAGE_PROD) . -f env.prod.Dockerfile

build: image-local
	mkdir -p $(PWD)/build
	docker run \
		--rm \
		-it \
		$(.SHARED_VOLUMES) \
		$(.ENV_VARIABLES) \
		--entrypoint=npm \
		$(DOCKER_IMAGE_LOCAL) run build

test: image-local
	docker run \
		--rm \
		-it \
		$(.SHARED_VOLUMES) \
		$(.ENV_VARIABLES) \
		--entrypoint=npm \
		$(DOCKER_IMAGE_LOCAL) run test

interactive: image-local
	docker run \
		--rm \
		--name $(DOCKER_IMAGE_ALIAS)-$(PORT) \
		-it \
		$(.SHARED_VOLUMES) \
		$(.ENV_VARIABLES) \
		-e NODE_OPTIONS="--inspect-port=$(PORT_DEBUG)" \
		-p $(PORT):$(PORT) \
		-p $(PORT_DEBUG):$(PORT_DEBUG) \
		--entrypoint=npm \
		$(DOCKER_IMAGE_LOCAL) run start

serve: build image-prod
	docker run \
		--rm \
		--name $(DOCKER_IMAGE_ALIAS)-serve-$(PORT) \
		-it \
		-v $(PWD)/build:/www/build \
		$(.ENV_VARIABLES) \
		-p $(PORT):$(PORT) \
		--entrypoint=node \
		$(DOCKER_IMAGE_PROD) /www/build/app.js
