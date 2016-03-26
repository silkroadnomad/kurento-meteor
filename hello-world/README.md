#Kurento on Meteor - Hello World

this webrtc demo is based on the [kurento tutorial tutorial-1-hello world](http://doc-kurento.readthedocs.org/en/stable/tutorials/node/tutorial-1-helloworld.html) adapted for [meteor](http://www.meteor.com) 




##Installation
1. Install Meteor with ``curl https://install.meteor.com/ | sh``
2. Clone this repo with ``git clone https://github.com/inspiraluna/kurento-meteor.git``
3. ``cd kurento-meteor/hello-world``
4. install and run kurento [docker](https://www.docker.com/) [image] (https://github.com/Kurento/kurento-docker/tree/master/docker) please run it with ``sudo docker run -d --name kurento -p 8888:8888 fiware/stream-oriented-kurento``
5. configure settings.json if kurento media server runs on different host
6. run ``meteor --settings setings.json` twice (after installing kurento-client npm package)


##iOS
- in order to run on ios, please execute ``meteor add-platform ios``
- connect your ios device and run ``meteor run ios-device``  and open the project in xcode
- don't convert to latest swift syntax! 
- within "Build Settings" add/set:
	-  "Enabl Bitcode" to ``no`
	-  "Runpath Search Paths" setting with value ``@executable_path/Frameworks``
	-  "Objective-C Bridging Header" to ``${PROJECT_NAME}/Plugins/cordova-plugin-iosrtc/cordova-plugin-iosrtc-Bridging-Header.h`` (read more about the "Bridging Header" above). see: https://github.com/eface2face/cordova-plugin-iosrtc/blob/master/docs/Building.md
	- meteor run-device ios

##Android
- in order to run on android, please execute ``meteor add-platform android``
- edit AndroidManifest.xml in .meteor/local/cordova-build/platforms/android and add:  
	``
		<uses-permission android:name="android.permission.CAMERA" /> 
		<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
	``  
- connect your android device and run ``meteor run android-device``

##Packages
- signaling is done by [meteor streams] (http://arunoda.github.io/meteor-streams/) (inactive project!) 

##known issues
1. force-ssl package breaks cordova in this version
2. don't upgrade to meteor version 1.3 because cordova-plugin-iosrtc package does not work with cordova 4
