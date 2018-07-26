
var sqlite3 = require('sqlite3').verbose();
var db = null;
var dbStartedSuccess = false;
var dbPath = 'nodeSCB.db';

var fs = require('fs');
var https = require('http');

var express = require('express');
var app = express();

var options = {
  key: fs.readFileSync('file.pem'),
  cert: fs.readFileSync('file.crt')
};
var serverPort = 3000;

var server = https.Server(app);
var io = require('socket.io')(server);

var roomTables = ["Room1", "Room2"];

checkAndCreateDatabase();
createSocketConnection();

function printQuery(query) {
	console.log("Query -  " + query);
}

function checkAndCreateDatabase() {
    
    if (!fs.existsSync(dbPath)) {
    
        fs.closeSync(fs.openSync(dbPath, 'w'));
    }
    
    startDatabase();
}

function startDatabase() {
    
    db = new sqlite3.cached.Database(dbPath, function(error) {
        
        if (error === null) {
            
            console.log("Database started successfully.");
            dbStartedSuccess = true;
            
            for (var i = 0; i < roomTables.length; i++) {
            	createNewTable(roomTables[i]);
            }
        }
        else {
            console.log("Failed to start database - " + error)
        }
    });
}

function createNewTable(newTableName) {

    if (dbStartedSuccess) {
        
        var newUserTable = "CREATE TABLE if not exists " + newTableName + "_TBL ( \
            BK_id INTEGER PRIMARY KEY, \
            user_id TEXT UNIQUE, \
            socket_id TEXT, \
            user_name TEXT, \
            connect_status BOOLEAN)";
            
        var newMsgTable = "CREATE TABLE if not exists " + newTableName + "_MSG_TBL ( \
            BK_id INTEGER PRIMARY KEY, \
            userChildId INTEGER, \
            message_text TEXT, \
            message_date DATETIME)";
        
        var newUserTypeTable = "CREATE TABLE if not exists " + newTableName + "_TY_TBL ( \
            BK_id INTEGER PRIMARY KEY, \
            user_id TEXT UNIQUE)";        

        db.serialize(function() {

            db.run(newUserTable);
            db.run(newMsgTable);
            db.run(newUserTypeTable);            
        });
    }
    else {
        console.log("Cannot create new table.");
    }
}

function insertData(sqlQuery, params, callback) {
    
    printQuery(sqlQuery);
    if (dbStartedSuccess) {
        
        var stmt = db.prepare(sqlQuery, [], function(prepareError) {
            
            if (prepareError === null) {
                
                stmt.bind(params, function(bindError) {
                    
                    if (bindError === null) {
                        
                        stmt.run([], function(runError, object) {
                            
                            callback(runError, object);
                        });
                        
                        stmt.finalize();
                    }
                    else {
                        console.log("Insert Binding Failed - " + bindError);
                        callback("IN_BIND_ERROR", null);
                    }
                });
            }
            else {
                console.log("Insert Prepare Failed - " + prepareError);
                callback("IN_PREPARE_ERROR", null);
            }
        });
    }
    else {
        console.log("Cannot insert new data.");
        callback("IN_ERROR", null);
    }
}

function updateData(sqlQuery, params, callback) {
    
    printQuery(sqlQuery);
    if (dbStartedSuccess) {
        
        var stmt = db.prepare(sqlQuery, [], function(prepareError) {
            
            if (prepareError === null) {
                
                stmt.bind(params, function(bindError) {
                    
                    if (bindError === null) {
                        
                        stmt.run([], function(runError, object) {
                            
                            callback(runError, object);
                        });
                        
                        stmt.finalize();
                    }
                    else {
                        console.log("Update Binding Failed - " + bindError);
                        callback("UP_BIND_ERROR", null);
                    }
                });
            }
            else {
                console.log("Update Prepare Failed - " + prepareError);
                callback("UP_PREPARE_ERROR", null);
            }
        });
    }
    else {
        console.log("Cannot update data.");
        callback("UP_ERROR", null);
    }
}

function getData(sqlQuery, params, callback, completion) {
    
    printQuery(sqlQuery);
    if (dbStartedSuccess) {
        
        var stmt = db.prepare(sqlQuery, [], function(prepareError) {
            
            if (prepareError === null) {
                
                stmt.bind(params, function(bindError) {
                    
                    if (bindError === null) {
                        
                        stmt.each([], function(eachError, row) {
                            
                            callback((eachError === null) ? true : false, row);
                            
                        }, function(completionError, totalRows) {
                            
                            console.log("TO " + totalRows);
                            completion((completionError === null) ? true : false, totalRows);
                        });
                        
                        stmt.finalize();
                    }
                    else {
                        console.log("Select Binding Failed - " + bindError);
                        completion(false, 0);
                    }
                });
            }
            else {
                console.log("Select Prepare Failed - " + prepareError);
                completion(false, 0);
            }
        });
    }
    else {
        console.log("Cannot get data.");
        completion(false, 0);
    }
}

function getAllData(sqlQuery, params, object, callback) {
    
    printQuery(sqlQuery);
    if (dbStartedSuccess) {
        
        var stmt = db.prepare(sqlQuery, [], function(prepareError) {
            
            if (prepareError === null) {
                
                stmt.bind(params, function(bindError) {
                    
                    if (bindError === null) {
                        
                        stmt.all([], function(eachError, allRows) {
                            
                            callback((eachError === null) ? true : false, allRows, object);
                        });
                        
                        stmt.finalize();
                    }
                    else {
                        console.log("Select All Binding Failed - " + bindError);
                        callback(false, null, object);
                    }
                });
            }
            else {
                console.log("Select All Prepare Failed - " + prepareError);
                callback(false, null, object);
            }
        });
    }
    else {
        console.log("Cannot get all data.");
        callback(false, null, object);
    }
}

function insertDataIntoUserTable(roomName, userData, callback) {
    
    var query = "INSERT INTO " + roomName + "_TBL VALUES (?, ?, ?, ?, ?)";
    var params = [null];
    
    if (!isNullValue(userData.userId)) {
        params.push(userData.userId);
    }
    else {
        callback("MISSING_DATA", false);
        return;
    }
    
    if (!isNullValue(userData.socketId)) {
        params.push(userData.socketId);
    }
    else {
        callback("MISSING_DATA", false);
        return;
    }
    
    if (!isNullValue(userData.nickName)) {
        params.push(userData.nickName);
    }
    else {
        callback("MISSING_DATA", false);
        return;
    }
    
    params.push(true);
    
    insertData(query, params, function(error, object) {
        
        callback(error, (error === null) ? true : false);
    });
}

function insertDataIntoUserTypeTable(roomName, userData, callback) {
    
    var query = "INSERT INTO " + roomName + "_TY_TBL VALUES (?, ?)";
    var params = [null];
    
    if (!isNullValue(userData.userId)) {
        params.push(userData.userId);
    }
    else {
        callback("MISSING_DATA", false);
        return;
    }       
    
    insertData(query, params, function(error, object) {
        
        callback(error, (error === null) ? true : false);
    });
}

function insertDataIntoMessageTable(roomName, userData, callback) {
    
    var query = "INSERT INTO " + roomName + "_MSG_TBL VALUES (?, ?, ?, ?)";
    var params = [null];
    
    if (!isNullValue(userData.userId)) {
        params.push(userData.userId);
    }
    else {
        callback("MISSING_DATA", false);
        return;
    }       
    
    if (!isNullValue(userData.message)) {
        params.push(userData.message);
    }
    else {
        callback("MISSING_DATA", false);
        return;
    }
    
    var currentDateTime = new Date().toLocaleString();
    params.push(currentDateTime);
    
    insertData(query, params, function(error, object) {
        
        callback(error, (error === null) ? true : false, currentDateTime);
    });
}

function getUserList(roomName, callback) {
    
    var query = "SELECT user_name AS nickName, connect_status AS status FROM " + roomName + "_TBL";
    var params = [];
    
    getAllData(query, params, "", function(status, rowData, object) {
        
        callback(status, rowData);
    });
}

function getTypingUserList(roomName, callback) {
    
    var tableName = roomName + "_TBL";
    var tyName = roomName + "_TY_TBL";
    var query = "SELECT " + tableName + ".user_name AS nickName FROM " + tableName + " INNER JOIN " + tyName + " ON " + tableName + ".user_id = " + tyName + ".user_id";
    var params = [];
    
    getAllData(query, params, "", function(status, rowData, object) {
        
        callback(status, rowData);
    });
}

function validateIfUserExist(roomName, userKey, userId, callback) {
    
    var query = "SELECT * FROM " + roomName + "_TBL WHERE " + userKey + " = ?";
    var params = [userId];
    
    getAllData(query, params, "", function(status, rowData, object) {
        
        if (!isNullValue(rowData) && rowData.length > 0) {
            callback(status, rowData[0]);
        }
        else {
            callback(false, null);
        }
    });
}

function searchForUser(userKey, userId, callback) {
    
    var resulData = [];
    var resultCompletion = 1;
	for (var i = 0; i < roomTables.length; i++) {

		var query = "SELECT * FROM " + roomTables[i] + "_TBL WHERE " + userKey + " = ?";
    	var params = [userId];
    	
    	getAllData(query, params, roomTables[i], function(status, rowData, object) {
        
	        if (!isNullValue(rowData) && rowData.length > 0) {

	        	var userInfo = {};
	        	userInfo.room = object;
	        	userInfo.row = rowData[0];
	        	resulData.push(userInfo);	        	    	       
        	}        	

        	if (resultCompletion >= roomTables.length) {
        		if (resulData.length <= 0) {
        			callback(false, null);
        		}
        		else {
        			console.log("Result search - " + JSON.stringify(resulData));
        			callback(true, resulData);
        		}        		
        	}
        	else {
        		resultCompletion += 1;
        	}
    	});
	}
}

function updateUserConnectionStatus(roomName, rowId, status, socketId, callback) {
    
    var query = "UPDATE " + roomName + "_TBL SET connect_status = ?, socket_id = ? WHERE BK_id = ?";
    var params = [status, socketId, rowId];
    
    updateData(query, params, function(error, object) {
        
        callback(error, (error === null) ? true : false);
    });
}

function removeTypingUser(roomName, userId, callback) {
    
    var query = "DELETE FROM " + roomName + "_TY_TBL WHERE user_id = ?";
    var params = [userId];
    
    updateData(query, params, function(error, object) {
        
        callback(error, (error === null) ? true : false);
    });
}

function removeUser(roomName, userId, callback) {
    
    var query = "DELETE FROM " + roomName + "_TBL WHERE user_id = ?";
    var params = [userId];
    
    updateData(query, params, function(error, object) {
        
        callback(error, (error === null) ? true : false);
    });
}

function isNullValue(object) {
    
    if (typeof object !== 'undefined' && object) {
        return false;
    }
    
    return true;
}

function createSocketConnection() {
    
    server.listen(serverPort, function() {
            
		console.log('Listening on *:' + serverPort);
	});
            
    io.on('connection', function(clientSocket) {
      
		console.log('a user connected');
		      
		clientSocket.on('disconnect', function() {
		                      
		console.log('user disconnected');
		                      
		searchForUser("socket_id", clientSocket.id, function(validStatus, rowArray) {

			if (!isNullValue(rowArray)) {
		                                
				console.log("User exist - " + rowArray);

				for (var i = 0; i < rowArray.length; i++) {

					var userInfo = rowArray[i];
					var roomName = userInfo.room;
					var row = userInfo.row;

                    clientSocket.leave(roomName);
                    
					updateUserConnectionStatus(roomName, row.BK_id, false, "", function(updateError, updateStatus) {

						if (updateStatus) {
		                                        
							getUserList(roomName, function(getError, rowData) {
		                
								if (getError != null) {
									console.log("GET User List data - " + rowData);
									io.sockets.in(roomName).emit("userList", rowData);
								}
								else {
									console.log("GET User List Error - " + getError);
								}
							});

							io.sockets.in(roomName).emit("userExitUpdate", row.user_name);
						}
						else {
							console.log("UPDATE User Con Error - " + updateError);
						}
					});

					removeTypingUser(roomName, row.user_id, function(deleteError, deleteStatus) {

						if (deleteStatus) {
							console.log("Delete User type status - " + deleteStatus);
						}

						getTypingUserList(roomName, function(getError, rowData) {
			                
							if (getError != null) {
								console.log("GET User Typing List data - " + rowData);                                                
								io.sockets.in(roomName).emit("userTypingUpdate", rowData);
							}
							else {
								console.log("GET User Typing List Error - " + getError);
							}
						}); 
					});
				}			
			}
		});                      
	});
      
      
	clientSocket.on("exitUser", function(clientId, roomName){
                      
		validateIfUserExist(roomName, "socket_id", clientSocket.id, function(validStatus, row) {

			if (!isNullValue(row)) {
		                                
				console.log("User exist - " + clientSocket.id);				

				clientSocket.leave(roomName);

				removeTypingUser(roomName, row.user_id, function(deleteError, deleteStatus) {

					if (deleteStatus) {
						console.log("Delete User type status - " + deleteStatus);
					}

					getTypingUserList(roomName, function(getError, rowData) {
		                
						if (getError != null) {
							console.log("GET User Typing List data - " + rowData);                                                
							io.sockets.in(roomName).emit("userTypingUpdate", rowData);
						}
						else {
							console.log("GET User Typing List Error - " + getError);
						}
					}); 
				});

				removeUser(roomName, row.user_id, function(deleteError, deleteStatus) {

					if (deleteStatus) {
						console.log("Delete User status - " + deleteStatus);						
					}

					getUserList(roomName, function(getError, rowData) {
		                
						if (getError != null) {
							console.log("GET User List data - " + rowData);
							io.sockets.in(roomName).emit("userList", rowData);
						}
						else {
							console.log("GET User List Error - " + getError);
						}
					});
				});
			}
		});
                      
	});
      
      
	clientSocket.on('chatMessage', function(clientId, message, roomName){
                      
        console.log("Sertting chatmessage " + clientId + "   m = " + message + " rr = " + roomName);
		validateIfUserExist(roomName, "user_id", clientId, function(validStatus, row) {
                            
			if (!isNullValue(row)) {

				var userInfo = {};
				userInfo.userId = row.BK_id;
				userInfo.message = message;

				insertDataIntoMessageTable(roomName, userInfo, function(insertError, insertStatus, insertDate) {

					if (insertStatus) {
						console.log("Insert User Message status - " + insertStatus);

						userInfo = {};
						userInfo.id = row.user_id;
						userInfo.nickname = row.user_name;
						userInfo.message = message;
                        userInfo.date = insertDate;

						io.sockets.in(roomName).emit("newChatMessage", userInfo);
					}
					else {
						console.log("INSERT User Typing List Error - " + insertError);
					}
				});

				removeTypingUser(roomName, row.user_id, function(deleteError, deleteStatus) {

					if (deleteStatus) {
						console.log("Delete User type status - " + deleteStatus);
					}

					getTypingUserList(roomName, function(getError, rowData) {
                
						if (getError != null) {
							console.log("GET User Typing List data - " + rowData);                                                
							io.sockets.in(roomName).emit("userTypingUpdate", rowData);
						}
						else {
							console.log("GET User Typing List Error - " + getError);
						}
					}); 
				});
			}
            else {
                console.log("Didnt find user");
            }
		});                         
	});      
      
	clientSocket.on("connectUser", function(clientId, clientNickname, roomName) {
                      
		var message = "User " + clientNickname + " was connected.";
		console.log(message);
                      
		var userInfo = {};
		userInfo.userId = clientId;
		userInfo.socketId = clientSocket.id;
		userInfo.nickName = clientNickname;
        
		validateIfUserExist(roomName, "user_id", clientId, function(validStatus, row) {
                            
			if (!isNullValue(row)) {
                                
				console.log("User exist - " + clientId);
                                
				updateUserConnectionStatus(roomName, row.BK_id, true, clientSocket.id, function(updateError, updateStatus) {
                                    
					if (updateStatus) {
                                        
						getUserList(roomName, function(getError, rowData) {
                
							if (getError != null) {
								console.log("GET User List data - " + rowData);
                                clientSocket.join(roomName);
								io.sockets.in(roomName).emit("userList", rowData);
							}
							else {
								console.log("GET User List Error - " + getError);
							}
						});
					}
					else {
						console.log("UPDATE User Con Error - " + updateError);
					}
				});
			}
			else {
                                
				console.log("User dont exist - " + clientId);
                                
				insertDataIntoUserTable(roomName, userInfo, function(insertError, insertStatus) {
                                    
					if (insertStatus) {
						console.log("Insert User status - " + insertStatus);
                                        
						getUserList(roomName, function(getError, rowData) {
                
							if (getError != null) {
								console.log("GET User List data - " + rowData);
								clientSocket.join(roomName);
								io.sockets.in(roomName).emit("userList", rowData);
							}
							else {
								console.log("GET User List Error - " + getError);
							}
						});
					}
					else {
						console.log("INSERT Error - " + insertError);
					}
				});
			}
		});  

        searchForUser("user_id", clientId, function(validStatus, rowArray) {

            if (!isNullValue(rowArray)) {
                                        
                console.log("User exist in another room - " + rowArray);

                for (var i = 0; i < rowArray.length; i++) {

                    var newUserInfo = rowArray[i];
                    var newRoomName = newUserInfo.room;
                    var newRow = newUserInfo.row;

                    if (newRoomName != roomName) {
                        updateUserConnectionStatus(newRoomName, newRow.BK_id, true, clientSocket.id, function(updateError, updateStatus) {

                            if (!updateStatus) {
                                console.log("UPDATE User in another room Error - " + updateError);                        
                            }
                        });
                    }                    
                }
            }
        });                                             
	});
      
      
	clientSocket.on("startType", function(clientId, roomName) {

		console.log("User " + clientId + " is writing a message...");    
                      
		validateIfUserExist(roomName, "user_id", clientId, function(validStatus, row) {
                            
			if (!isNullValue(row)) {

				var userInfo = {};
				userInfo.userId = clientId;

				insertDataIntoUserTypeTable(roomName, userInfo, function(insertError, insertStatus) {

					if (insertStatus) {
						console.log("Insert User type status - " + insertStatus);						                              
					}
					else {
						console.log("INSERT User Typing List Error - " + insertError);
					}

                    getTypingUserList(roomName, function(getError, rowData) {
                
                        if (getError != null) {
                            console.log("GET User Typing List data - " + JSON.stringify(rowData));                                                
                            io.sockets.in(roomName).emit("userTypingUpdate", rowData);
                        }
                        else {
                            console.log("GET User Typing List Error - " + getError);
                        }
                    }); 
				});
			}
		});                         
	});
      
      
	clientSocket.on("stopType", function(clientId, roomName) {

		console.log("User " + clientId + " has stopped writing a message...");
                      
		removeTypingUser(roomName, clientId, function(deleteError, deleteStatus) {

			if (deleteStatus) {
				console.log("Delete User type status - " + deleteStatus);
			}

			getTypingUserList(roomName, function(getError, rowData) {
                
				if (getError != null) {
					console.log("GET User Typing List data - " + rowData);                                                
					io.sockets.in(roomName).emit("userTypingUpdate", rowData);
				}
				else {
					console.log("GET User Typing List Error - " + getError);
				}
			}); 
		});                                            
	});
      
	});
}
