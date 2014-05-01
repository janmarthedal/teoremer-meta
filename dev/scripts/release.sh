cd ../..
rm -rf production
mkdir production
cd production
cp -r ../analysis .
cp -r ../api .
cp -r ../document .
cp -r ../drafts .
cp -r ../items .
cp -r ../main .
cp -r ../media .
cp -r ../sources .
cp -r ../tags .
cp -r ../templates .
cp -r ../thrms .
cp -r ../users .
mkdir static
cp -r ~/www/static/* static/
cp ../manage.py .
cp ../dev/scripts/maintenance.sh .
find . -name '*.pyc' -exec rm {} \;
find . -name '.gitignore' -exec rm {} \;

cd templates
TMP=`git show -s --format="%ci" HEAD | sed 's/^\(....\)-\(..\)-\(..\).*/\1.\2.\3/'`.`git rev-parse --short HEAD`; sed -i "s/COMMITDATA/$TMP/" base.html
cd .. 

tar cjf ../production.tar.bz2 *
