import React, { useEffect, useRef, useState } from "react";
import styles from "./videoCompStyle.module.css";
import { TextField, Button, IconButton } from "@mui/material";
import { Videocam, VideocamOff, Mic, MicOff, CallEnd, ScreenShare, Chat, Send } from "@mui/icons-material";
import { io } from "socket.io-client";
import server from "../../environment";


const serverUrl = server;

const VideoComponent = () => {
  var socketRef = useRef();
  let socketIdRef = useRef();
  let localVideoref = useRef();
  const cameraStreamRef = useRef(null);
  const displayStreamRef = useRef(null);
  const outgoingStreamRef = useRef(null);

  let [videoAvailable, setVideoAvailable] = useState(true);

  let [audioAvailable, setAudioAvailable] = useState(true);

  let [video, setVideo] = useState(true);

  let [audio, setAudio] = useState(true);

  let [screen, setScreen] = useState(false);

  let [showModal, setModal] = useState(true);

  let [screenAvailable, setScreenAvailable] = useState(false);

  let [messages, setMessages] = useState([]);

  let [message, setMessage] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const chatEndRef = useRef(null);

  let [newMessages, setNewMessages] = useState(3);

  let [askForUsername, setAskForUsername] = useState(true);

  let [username, setUsername] = useState("");

  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);

  const videoRefs = useRef({});
  const videoRef = useRef([]);
  const connectionsRef = useRef({});
  const peerConfigConnections = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  let [videos, setVideos] = useState([]);

  const getPermissions = async () => {
    try {
      const userMediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setVideoAvailable(true);
      setAudioAvailable(true);
      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

      window.localStream = userMediaStream;
      cameraStreamRef.current = userMediaStream;
      outgoingStreamRef.current = userMediaStream;
      if (localVideoref.current) {
        localVideoref.current.srcObject = userMediaStream;
      }
    } catch (err) {
      console.error("Error occurred while getting media permissions:", err);
      setVideoAvailable(false);
      setAudioAvailable(false);
      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
    }
  };

  useEffect(() => {
    getPermissions();
  }, []);

  let getUserMediaSuccess = (stream) => {
    try {
    } catch (err) {
      console.error("Error occurred in getUserMediaSuccess:", err);
    }

    setLocalStream(stream);
    cameraStreamRef.current = stream;

    for (let id in connectionsRef.current) {
      if (id === socketIdRef.current) continue;
      window.localStream.getTracks().forEach((track) => {
        connectionsRef.current[id].addTrack(track, window.localStream);
      });
      connectionsRef.current[id]
        .createOffer()
        .then((description) => {
          connectionsRef.current[id]
            .setLocalDescription(description)
            .then(() => {
              socketRef.current.emit(
                "signal",
                id,
                JSON.stringify({
                  sdp: connectionsRef.current[id].localDescription,
                }),
              );
            })
            .catch((e) => console.log(e));
        })
        .catch((e) => console.log(e));
    }
    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setVideo(false);
          setAudio(false);
          try {
            let tracks = localVideoref.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (err) {
            console.error("Error occurred while stopping media tracks:", err);
          }
          // todo black silence

          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);
          window.localStream = blackSilence();
          localVideoref.current.srcObject = window.localStream;

          for (let id in connectionsRef.current) {
            if (id === socketIdRef.current) continue;
            window.localStream.getTracks().forEach((track) => {
              connectionsRef.current[id].addTrack(track, window.localStream);
            });
            connectionsRef.current[id]
              .createOffer()
              .then((description) => {
                connectionsRef.current[id]
                  .setLocalDescription(description)
                  .then(() => {
                    socketRef.current.emit(
                      "signal",
                      id,
                      JSON.stringify({
                        sdp: connectionsRef.current[id].localDescription,
                      }),
                    );
                  })
                  .catch((e) => console.log(e));
              })
              .catch((e) => console.log(e));
          }
        }),
    );
  };

  let silence = () => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();

    let dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };

  let black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });
    canvas.getContext("2d").fillRect(0, 0, width, height);
    const stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  const addRemoteStreamToState = (peerId, stream, peerName) => {
    if (!stream) return;
    setVideos((videos) => {
      const streamKey = `${peerId}-${Date.now()}`;
      const updatedVideos = videos.some((video) => video.socketId === peerId)
        ? videos.map((video) =>
            video.socketId === peerId
              ? { ...video, stream, username: peerName || video.username, streamKey }
              : video,
          )
        : [
            ...videos,
            {
              socketId: peerId,
              stream,
              username: peerName || peerId,
              autoplay: true,
              playsInline: true,
              muted: true,
              streamKey,
            },
          ];

      videoRef.current = updatedVideos;
      return updatedVideos;
    });
  };

  const getLocalStream = () => {
    if (window.localStream) return window.localStream;
    const localStream = new MediaStream([black(), silence()]);
    window.localStream = localStream;
    return localStream;
  };

  const setLocalStream = (stream) => {
    window.localStream = stream;
    outgoingStreamRef.current = stream;
    if (localVideoref.current) {
      localVideoref.current.srcObject = stream;
    }
  };

  const stopDisplayStream = () => {
    if (!displayStreamRef.current) return;
    displayStreamRef.current.getTracks().forEach((track) => track.stop());
    displayStreamRef.current = null;
  };

  const replaceVideoTrackOnPeers = async (newTrack, stream = outgoingStreamRef.current || window.localStream || getLocalStream()) => {
    const peerPromises = Object.entries(connectionsRef.current).map(async ([peerId, pc], idx) => {
      try {
        const videoSenders = pc.getSenders().filter((s) => s.track && s.track.kind === "video");
        if (videoSenders.length > 0 && newTrack) {
          await Promise.all(videoSenders.map((sender) => sender.replaceTrack(newTrack)));
          console.log("screen-share: replaced video track on peer", idx, newTrack.id);
        } else if (newTrack) {
          pc.addTrack(newTrack, stream);
          console.log("screen-share: added new video track on peer", idx, newTrack.id);
        }

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (socketRef.current && pc.localDescription) {
          socketRef.current.emit("signal", peerId, JSON.stringify({ sdp: pc.localDescription }));
        }
      } catch (e) {
        console.warn("screen-share: replaceVideoTrackOnPeers error", e);
      }
    });
    await Promise.all(peerPromises);
  };

  const renegotiateAllPeers = async () => {
    const peerPromises = Object.entries(connectionsRef.current).map(async ([peerId, pc]) => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (socketRef.current && pc.localDescription) {
          socketRef.current.emit("signal", peerId, JSON.stringify({ sdp: pc.localDescription }));
          console.log("screen-share: renegotiation offer sent to", peerId);
        }
      } catch (e) {
        console.warn("screen-share: renegotiateAllPeers error", e);
      }
    });
    await Promise.all(peerPromises);
  };

  const createPeerConnection = (peerId) => {
    if (connectionsRef.current[peerId]) return connectionsRef.current[peerId];

    const pc = new RTCPeerConnection(peerConfigConnections);

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit(
          "signal",
          peerId,
          JSON.stringify({ ice: event.candidate }),
        );
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams && event.streams[0];
      if (!stream) return;
      addRemoteStreamToState(peerId, stream);
    };

    const localStream = outgoingStreamRef.current || window.localStream || getLocalStream();
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    connectionsRef.current[peerId] = pc;
    return pc;
  };

  let getUserMedia = () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      navigator.mediaDevices
        .getUserMedia({
          video: !!video,
          audio: !!audio,
        })
        .then(getUserMediaSuccess)
        .catch((err) => {
          console.error("Error occurred while getting media permissions:", err);
        });
    } else {
      try {
        const tracks = localVideoref.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      } catch (err) {
        console.error("Error occurred while stopping media tracks:", err);
      }
    }
  };

  useEffect(() => {
    if (video !== undefined && audio !== undefined) {
      getUserMedia();
    }
  }, [video, audio]);

  let getMessageFromServer = (fromId, message, fromUsername) => {
    let signal;
    try {
      signal = JSON.parse(message);
    } catch (error) {
      console.error("Invalid signal message:", error, message);
      return;
    }

    if (fromId === socketIdRef.current) return;

    let connection = connectionsRef.current[fromId];
    if (!connection) {
      console.log("Creating peer connection on signal for", fromId);
      connection = createPeerConnection(fromId);
    }

    if (signal.sdp) {
      connection
        .setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(() => {
          if (signal.sdp.type === "offer") {
            return connection.createAnswer();
          }
          return null;
        })
        .then((description) => {
          if (!description) return null;
          return connection.setLocalDescription(description);
        })
        .then(() => {
          if (
            signal.sdp.type === "offer" &&
            connection.localDescription &&
            socketRef.current
          ) {
            socketRef.current.emit(
              "signal",
              fromId,
              JSON.stringify({ sdp: connection.localDescription }),
            );
          }
        })
        .catch((e) => console.log(e));
    }

    if (signal.ice) {
      connection
        .addIceCandidate(new RTCIceCandidate(signal.ice))
        .catch((e) => console.log(e));
    }

    if (fromUsername) {
      setVideos((videos) =>
        videos.map((video) =>
          video.socketId === fromId ? { ...video, username: fromUsername } : video,
        ),
      );
    }
  };

  let connectToSocketServer = () => {
    if (socketRef.current && socketRef.current.connected) return;

    socketRef.current = io.connect(serverUrl, {
      secure: false,
    });

    socketRef.current.on("connect", () => {
      console.log("socket connected:", socketRef.current.id);
      socketIdRef.current = socketRef.current.id;

        socketRef.current.on("signal", getMessageFromServer);
      socketRef.current.on("chat-message", addMessage);

      socketRef.current.emit("join-call", window.location.href, username);
      console.log("join-call emitted", window.location.href, username);

      socketRef.current.on("user-left", (id) => {
        setVideos((videos) => videos.filter((video) => video.socketId !== id));
      });

      socketRef.current.on("user-joined", ({ socketId, username: remoteUsername }) => {
        setVideos((videos) => {
          const exists = videos.some((video) => video.socketId === socketId);
          if (exists) return videos;
          return [
            ...videos,
            {
              socketId,
              username: remoteUsername || socketId,
              stream: null,
              autoplay: true,
              playsInline: true,
              muted: true,
            },
          ];
        });

        const pc = createPeerConnection(socketId);
        pc.createOffer()
          .then((description) => pc.setLocalDescription(description))
          .then(() => {
            if (socketRef.current && pc.localDescription) {
              socketRef.current.emit(
                "signal",
                socketId,
                JSON.stringify({ sdp: pc.localDescription }),
              );
            }
          })
          .catch((e) => console.log(e));
      });
    });
  };

  let addMessage = (data, sender, senderSocketId) => {
    if (!data) return;
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: `${senderSocketId || "msg"}-${Date.now()}-${Math.random()}`,
        text: data,
        sender: sender || "Unknown",
        isMine: senderSocketId === socketIdRef.current,
      },
    ]);
  };

  let getMedia = () => {
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    connectToSocketServer();
  };

  useEffect(() => {
    videos.forEach((video) => {
      const ref = videoRefs.current[video.socketId];
      if (ref && video.stream) {
        if (ref.srcObject !== video.stream) {
          ref.srcObject = video.stream;
        }
      }
    });
  }, [videos]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatOpen]);

  let connect = () => {
    setAskForUsername(false);
    getMedia();
  };

  const handleToggleVideo = () => {
    setVideo(!isVideoOn);
    setIsVideoOn(!isVideoOn);
  };

  const handleToggleAudio = () => {
    setAudio(!isAudioOn);
    setIsAudioOn(!isAudioOn);
  };

  const handleToggleChat = () => {
    setChatOpen((prev) => !prev);
  };

  const handleSendMessage = () => {
    if (!message.trim() || !socketRef.current) return;

    socketRef.current.emit("chat-message", message.trim(), username || "You");
    setMessage("");
  };

  const handleEndCall = () => {
    setAskForUsername(true);
    setVideos([]);
    stopDisplayStream();
    if (window.localStream) {
      window.localStream.getTracks().forEach((track) => track.stop());
      window.localStream = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const handleScreenShare = async () => {
    try {
      const stopScreenShare = async () => {
        stopDisplayStream();

        const cam = cameraStreamRef.current;
        const camVideoTrack = cam?.getVideoTracks()[0];
        const camAudioTrack = cam?.getAudioTracks()[0];
        if (camVideoTrack || camAudioTrack) {
          const restoredStream = new MediaStream();
          if (camVideoTrack) restoredStream.addTrack(camVideoTrack);
          if (camAudioTrack) restoredStream.addTrack(camAudioTrack);

          setLocalStream(restoredStream);

          if (camVideoTrack) {
            await replaceVideoTrackOnPeers(camVideoTrack, restoredStream);
            await renegotiateAllPeers();
          }
        } else {
          const backupVideoTrack = outgoingStreamRef.current?.getVideoTracks()[0];
          if (backupVideoTrack) {
            const restoredStream = new MediaStream();
            restoredStream.addTrack(backupVideoTrack);
            setLocalStream(restoredStream);
            await replaceVideoTrackOnPeers(backupVideoTrack, restoredStream);
            await renegotiateAllPeers();
          }
        }

        setScreen(false);
      };

      if (screen) {
        await stopScreenShare();
        return;
      }

      if (!screenAvailable) {
        console.warn("Screen sharing is not supported in this browser.");
        return;
      }

      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      stopDisplayStream();
      displayStreamRef.current = displayStream;
      const displayVideo = displayStream.getVideoTracks()[0];

      if (displayVideo) {
        const audioTrack = cameraStreamRef.current?.getAudioTracks()[0];
        const outgoingStream = new MediaStream();
        outgoingStream.addTrack(displayVideo);
        if (audioTrack) outgoingStream.addTrack(audioTrack);

        setLocalStream(outgoingStream);
        await replaceVideoTrackOnPeers(displayVideo, outgoingStream);
        await renegotiateAllPeers();

        displayVideo.onended = async () => {
          await stopScreenShare();
        };
      }

      setScreen(true);
    } catch (err) {
      console.error("Error occurred while sharing screen:", err);
    }
  };

  return (
    <div>
      {askForUsername === true ? (
        <div className={styles.lobbyContainer}>
          <div className={styles.lobbyCard}>
            <h2 className={styles.lobbyTitle}>Enter the lobby</h2>
            <p className={styles.lobbySubtitle}>Choose a display name and join the room.</p>

            <div className={styles.lobbyForm}>
              <TextField
                id="outlined-basic"
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={styles.lobbyInput}
              />
              <Button variant="contained" onClick={connect} className={styles.lobbyButton}>
                Connect
              </Button>
            </div>

            <div className={styles.lobbyPreviewWrapper}>
              <video ref={localVideoref} autoPlay muted className={styles.lobbyPreviewVideo}></video>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.videoContainer}>
          <div className={styles.meetingMain}>
            <div className={styles.videoArea}>
              <div className={styles.videoGrid}>
                {videos.map((video) => (
                  <div key={video.socketId} className={styles.remoteVideoWrapper}>
                    <h3 className={styles.videoLabel}>
                      {video.username || video.socketId.slice(0, 8)}
                    </h3>
                    <video
                      data-socket={video.socketId}
                      ref={(ref) => {
                        if (ref) {
                          videoRefs.current[video.socketId] = ref;
                          if (video.stream && ref.srcObject !== video.stream) {
                            ref.srcObject = video.stream;
                          }
                        }
                      }}
                      autoPlay
                      playsInline
                      className={styles.video}
                    ></video>
                  </div>
                ))}
                <div className={styles.localVideoWrapper}>
                  <video ref={localVideoref} autoPlay muted className={styles.video}></video>
                  <p className={styles.videoLabel}>{username || "You"}</p>
                </div>
              </div>
            </div>

            {chatOpen && (
              <div className={styles.chatPanel}>
                <div className={styles.chatHeader}>
                  <h3 className={styles.chatTitle}>Chat</h3>
                  <Button size="small" onClick={handleToggleChat} className={styles.chatCloseButton}>
                    Close
                  </Button>
                </div>

                <div className={styles.chatMessages}>
                  {messages.length === 0 && (
                    <div className={styles.chatEmpty}>No messages yet. Start the conversation.</div>
                  )}

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`${styles.chatBubble} ${msg.isMine ? styles.chatBubbleMine : ""}`}
                    >
                      <div className={styles.chatSender}>{msg.isMine ? "You" : msg.sender}</div>
                      <div>{msg.text}</div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <div className={styles.chatComposer}>
                  <TextField
                    style={{ backgroundColor: "blue" }}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message"
                    variant="outlined"
                    size="small"
                    fullWidth
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <IconButton onClick={handleSendMessage} className={styles.sendButton} style={{color : "white"}} title="Send message">
                    <Send />
                  </IconButton>
                </div>
              </div>
            )}
          </div>

          <div className={styles.controlPanel}>
            <IconButton
              onClick={handleToggleVideo}
              className={`${styles.controlButton} ${isVideoOn ? styles.active : styles.inactive}`}
              title={isVideoOn ? "Turn off video" : "Turn on video"}
            >
              {isVideoOn ? <Videocam /> : <VideocamOff />}
            </IconButton>

            <IconButton
              onClick={handleToggleAudio}
              className={`${styles.controlButton} ${isAudioOn ? styles.active : styles.inactive}`}
              title={isAudioOn ? "Turn off microphone" : "Turn on microphone"}
            >
              {isAudioOn ? <Mic /> : <MicOff />}
            </IconButton>

            <IconButton
              onClick={handleScreenShare}
              className={`${styles.controlButton} ${screen ? styles.active : styles.inactive}`}
              title={screen ? "Stop sharing screen" : "Share screen"}
            >
              <ScreenShare />
            </IconButton>

            <IconButton
              onClick={handleToggleChat}
              className={`${styles.controlButton} ${chatOpen ? styles.active : styles.inactive}`}
              title={chatOpen ? "Close chat" : "Open chat"}
            >
              <Chat />
            </IconButton>

            <IconButton
              onClick={handleEndCall}
              className={`${styles.controlButton} ${styles.endCall}`}
              title="End call"
            >
              <CallEnd />
            </IconButton>
          </div>
        </div>
      )}
    </div>
  );
};
export default VideoComponent;
