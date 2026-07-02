import React from 'react'
import { useNavigate } from 'react-router-dom';
import { useState, useContext } from 'react';
import withAuth from '../../utils/withAuth';
import styles from './homeStyle.module.css';
import IconButton from '@mui/material/IconButton';
import RestoreIcon from '@mui/icons-material/Restore';
import { AuthContext } from '../../contexts/AuthContext';


const Home = () => {
    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");
    const [history, setHistory] = useState([]);
    const [historyError, setHistoryError] = useState("");
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const { addToUserHistory, getHistoryOfUser } = useContext(AuthContext);

    let handleJoinVideoCall = async () => {
        const trimmedCode = meetingCode.trim();

        if (!trimmedCode) {
            return;
        }

        await addToUserHistory(trimmedCode);
        navigate(`/${trimmedCode}`);
    }

    const handleHistoryClick = async () => {
        if (showHistory && history.length > 0) {
            setShowHistory(false);
            return;
        }

        setLoadingHistory(true);
        setHistoryError("");
        setShowHistory(true);

        try {
            const response = await getHistoryOfUser();
            setHistory(Array.isArray(response) ? response : []);
        } catch (error) {
            setHistoryError(error.message || 'Failed to load history');
        } finally {
            setLoadingHistory(false);
        }
    }
  return (
    <div className={styles.homeContainer}>
      <div className={styles.navbar}>
        <h1 className={styles.logo}>EchoWave</h1>
        <div className={styles.navRight}>
          <IconButton className={styles.historyBtn} onClick={handleHistoryClick}>
            <RestoreIcon style={{ color: 'white' }} />
          </IconButton>
          <p className={styles.historyText}>History</p>
          <button className={styles.logoutBtn} onClick={() => {
            localStorage.removeItem('token');
            navigate('/auth');
          }}>
            Logout
          </button>
        </div>
      </div>

      <div className={styles.mainContainer}>
        <h2 className={styles.mainTitle}>Providing a quality video Call</h2>
        <input
          className={styles.meetingInput}
          type="text"
          placeholder="Enter meeting code"
          value={meetingCode}
          onChange={(e) => setMeetingCode(e.target.value)}
        />
        <div className={styles.buttonGroup}>
          <button className={styles.joinBtn} onClick={handleJoinVideoCall}>
            Join Video Call
          </button>
        </div>

        {showHistory ? (
          <>
            {historyError ? <p className={styles.errorText}>{historyError}</p> : null}

            {loadingHistory ? (
              <p className={styles.noHistoryText}>Loading history...</p>
            ) : history.length > 0 ? (
              <div className={styles.historyContainer}>
                <h3 className={styles.historyTitle}>Recent meetings</h3>
                <ul className={styles.historyList}>
                  {history.map((item) => (
                    <li key={item._id} className={styles.historyItem}>
                      <div className={styles.historyItemCode}>{item.meeting_id}</div>
                      <div className={styles.historyItemDate}>
                        {new Date(item.date).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className={styles.noHistoryText}>No history yet.</p>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

export default withAuth(Home)