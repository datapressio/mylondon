Serve
=====

~~~
virtualenv -ppython3 env3
. env3/bin/activate
pip install -r serve_requirements.txt
python serve.py
~~~

~~~
apib -d 3 -c 10 http://localhost:8080/
~~~
