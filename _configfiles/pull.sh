cd /var/www/particles && git pull -q
cd /var/www/pyvisualizer/pyvisualizer && git pull -q
cd /var/www/archiver/archiver && git pull -q
cd /var/www/cs61a && git pull -q
cd /var/www/coding-js && git pull -q
cd /var/www/web && git pull -q && /usr/local/bin/jekyll build > /dev/null
