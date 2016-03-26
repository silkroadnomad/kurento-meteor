#Kurento on Meteor - Hello World

this webrtc demo is based on the [kurento tutorial tutorial-1-hello world](http://doc-kurento.readthedocs.org/en/stable/tutorials/node/tutorial-1-helloworld.html) adapted for [meteor](http://www.meteor.com) 




##Installation
- ``git clone https://github.com/inspiraluna/kurento-meteor.git``
- ``cd hello-world``
- install and run kurento [docker](https://www.docker.com/) [image] (https://github.com/Kurento/kurento-docker/tree/master/docker) please run it with ``sudo docker run -d --name kurento -p 8888:8888 fiware/stream-oriented-kurento``
- configure settings.json if kurento media server runs on different host
- ``meteor --settings setings.json``

##Packages
- signaling is done by [meteor streams] (http://arunoda.github.io/meteor-streams/) (inactive project!) 
