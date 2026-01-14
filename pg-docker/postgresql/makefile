run:
	sudo docker-compose up -d

stop:
	sudo docker-compose down

restart:
	sudo docker-compose restart

logs:
	sudo docker logs -f pg_min_papers

down-delete:
	clear;echo "\e[0m\e[0;101m\e[1;93m\n\e[0m\e[0;101m\e[1;93m============================================================================================\e[0m\n\e[0m\e[0;101m\e[1;93m=                                                                                          =\e[0m\n\e[0m\e[0;101m\e[1;93m=  \e[1;93m[CRITICAL] ALERT: DOWN-DELETE MAY HARM PRODUCTION ENVIRONMENT, USE JUST IN DEVELOPMENT  \e[0;101m\e[1;93m=\e[0m\n\e[0m\e[0;101m\e[1;93m=          \e[1;93mTHIS SCRIPT WILL SLEEP FOR 15 SECONDS, USE THIS TIME TO STOP EXECUTION  \e[0;101m\e[1;93m        =\e[0m\n\e[0m\e[0;101m\e[1;93m=                                                                                          =\e[0m\n\e[0m\e[0;101m\e[1;93m============================================================================================\e[0m\n"
	sleep 15
	sudo docker-compose down --volumes --rmi all
	rm -rf __pycache__ .env initdb docker-compose.yml .passwords

clean:
	rm -rf __pycache__ .env initdb docker-compose.yml .passwords

setup:
	python3 ./setup.py

