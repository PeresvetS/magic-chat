app:
	docker-compose stop && docker-compose up

app-build:
	docker-compose build

app-bash:
	docker-compose run --rm app bash

app-lint:
	docker-compose run --rm app yarn eslint .