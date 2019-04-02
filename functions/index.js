const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
exports.addToUserDb =
functions
.region('europe-west1')
.auth.user().onCreate((user) => {
  const email = user.email; // The email of the user.
  const displayName = user.displayName; // The display name of the user.
  const uid = user.uid;

  admin.firestore().collection("users").doc(uid).set({
    name: displayName,
    email: email,
    uid: uid,
    nascholer:false
  })
  .then(function() {
    return "Document successfully written!";
  })
  .catch(function(error) {
    throw new Error("Error writing document: ", error);
  });


});


exports.setUserClaimsOnDb =
functions
.region('europe-west1')
.firestore
.document('users/{userId}')
.onUpdate((change, context) => {
  // Get an object representing the document
  // e.g. {'name': 'Marie', 'age': 66}
  const updatedStatus = change.after.data();

  // ...or the previous value before this update
  const previousValue = change.before.data();

  // access a particular field as you would any JS property
  const name = updatedStatus.name;
  const uid = updatedStatus.uid;
  const accessgranted = updatedStatus.nascholer;
  // perform desired operations ...
  var customClaims = admin.auth().setCustomUserClaims(uid, {nascholer: accessgranted}).then(() => {
    console.log("nascholer CHANGED TO "+accessgranted+" > " + uid);
    return {nascholer: accessgranted};
  })




});


exports.addToTags =
functions
.region('europe-west1')
.firestore
.document('nascholingen/{nascholing}')
.onUpdate((change, context) => {

  // Get an object representing the document
  // e.g. {'name': 'Marie', 'age': 66}
  const updatedCourse = change.after.data();
  var arrayOfTagsToAdd = updatedCourse.tags;
  //  console.log("ARRAY TO ADD >> " + JSON.stringify(arrayOfTagsToAdd))
  //  console.log(arrayOfTagsToAdd);

  var allTagsPromise = new Promise((resolve,reject) => {
    var allTags = [];
    admin.firestore().collection('nascholingen').get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        var data = doc.data();
      //  console.log("data > " + JSON.stringify(data));
        var foundTags = Object.keys(data.tags)
        for (var i = 0; i < foundTags.length; i++)
        {
          if (allTags.indexOf(foundTags[i]) === -1)
          {
            allTags.push(foundTags[i]);
          }
        }
      })
      resolve(allTags);
      return allTags;
    })
    .catch((err)=>{reject(err)})
  })


  allTagsPromise.then((allTags)=>{
  //  console.log("SETTING... "+typeof allTags + " :> " + JSON.stringify(allTags))
    admin.firestore().collection('nascholingen-tags').get()
    .then ((querySnapshot) => {
      var toBeDeleted = [];
      var toBeAdded = [];
      querySnapshot.forEach((doc)=>{

        var data = doc.data();
      //  console.log("handling > " +data.name +" ... ")
        if (allTags.indexOf(data.name) > -1)
        {
      //    console.log("Deze tag mag blijven staan > " + data.name)
          for( let i = 0; i < allTags.length; i++)
          {
            if ( allTags[i] === data.name)
            {
              allTags.splice(i, 1);
            }
          }


        }
        else
        {
      //    console.log("Deze tag moet weg, hij wordt nergens meer gebruikt. > " + data.name )
          toBeDeleted.push(data.name)
        }

      })
    //  console.log("TAGS TO BE ADDED > " + JSON.stringify(allTags))

      for (let i = 0 ; i < allTags.length; i++)
      {
        admin.firestore().collection('nascholingen-tags').add({name:allTags[i]});
      }
    //  console.log("TAGS TO BE DELETED > " + JSON.stringify(toBeDeleted))
      for (let i = 0; i < toBeDeleted.length; i++)
      {
        var deletable = admin.firestore().collection('nascholingen-tags').where('name','==',toBeDeleted[i]);
        deletable.get().then((querySnapshot)=> {
          querySnapshot.forEach((doc) => {
            doc.ref.delete();
          });
          return "done"
        }).catch((error)=>{throw error});
      }
      return "fixed"
    })
    .catch((err)=>{throw err})

    return "SUCCES"})
    .catch((err)=> {return "Error! " + err})
  }  )

  exports.updateCourseParticipants =
  functions
  .region('europe-west1')
  .firestore
  .document('users-inschrijvingen/{userId}')
  .onUpdate((change, context) => {
    // Get an object representing the document
    // e.g. {'name': 'Marie', 'age': 66}
    const oldStatus = change.before.data();
    const updatedStatus = change.after.data();
    const uid = context.params.userId
    //console.log(JSON.stringify(updatedStatus))
    var inschrijvingen = [];
    var courses = {}
    var allCourseIds = [];
    admin.firestore().collection('nascholingen').get()
    .then((querySnapshot) => {
          querySnapshot.forEach((doc) => {
            console.log("nascholingDOC: " + doc.id)
            var data = doc.id;
          //  console.log("data > " + JSON.stringify(data));
            var foundCourses = data //Object.keys(data)
            allCourseIds.push(data)// = [...allCourseIds,...foundCourses];
          })
          for (var i = 0; i < allCourseIds.length; i++)
            {
            //  console.log("updating course " + allCourseIds[i])
              admin.firestore().collection('nascholingen').doc(allCourseIds[i]).update({emailList: [] , numberParticipants : 0,listOfUsers:[]})
            }

              admin.firestore().collection('users-inschrijvingen').get()
                  .then((querySnapshot) => {
                    querySnapshot.forEach((doc) => {
                      var data = doc.data();
                  //    console.log("data > " + JSON.stringify(data));
                      var foundparticipants = Object.keys(data)
                      inschrijvingen = [...inschrijvingen,...foundparticipants];

                    })
                    for (var i = 0; i < inschrijvingen.length; i++)
                      {
                        var userid = inschrijvingen[i].split('-')[0]
                        var courseid = inschrijvingen[i].split('-')[1]
                          if (!courses[courseid]) {courses[courseid] = {users:[], participants:0} }
                        courses[courseid].users.push(userid);
                        courses[courseid].participants++;
                      }
                    //  console.log("OUTPUT=" + JSON.stringify(courses))

                      var courseids = Object.keys(courses);
                      var users = {};
                      admin.firestore().collection('users').get()
                        .then((querySnapshot) => {
                          querySnapshot.forEach((doc) => {
                            users[doc.data().uid] = doc.data();
                          })

                      for (var i = 0; i < courseids.length; i++)
                        {
                          var emaillist = [];
                          for (var u = 0; u < courses[courseids[i]].users.length; u++)
                            {
                              var uid = courses[courseids[i]].users[u];
                              var email = users[uid].email;
                              emaillist.push(email)
                            }
                          admin.firestore().collection('nascholingen').doc(courseids[i]).update({emailList:emaillist,numberParticipants : courses[courseids[i]].participants,listOfUsers:courses[courseids[i]].users})
                        }

                      })

                  })


    // ...or the previous value before this update
    const previousValue = change.before.data();

    // access a particular field as you would any JS property


    // perform desired operations ...

    })
})
