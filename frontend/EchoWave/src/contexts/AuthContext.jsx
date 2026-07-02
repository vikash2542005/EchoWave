import axios from 'axios'
import { createContext } from 'react'
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import server from '../environment';


export const AuthContext = createContext({});

const client = axios.create({
  baseURL: `${server}/api/users`,
  withCredentials: true,
});

export const AuthProvider = ({ children }) => {
    const authContext = useContext(AuthContext);

    const [userData, setUserData] = useState(authContext);

    const  router = useNavigate();

    const handleRegister = async(name, username, password) => {
        try {
            const request = await client.post('/users/signup', { name, username, password });
            if (request.status === 201) {
                setUserData(request.data);
                return request.data.message || 'Registration successful';
            }
        }
        catch (err) {
            console.error('Registration error:', err);
            return err?.response?.data?.message || 'Registration failed';
        }
    }

// login 

    const handleLogin = async(username, password) => {
        try {
            const request = await client.post('/users/login', { username, password });
            if (request.status === 200) {
                localStorage.setItem('token', JSON.stringify(request.data));
                setUserData(request.data);
                return request.data.message || 'Login successful';
            }
        }
        catch (err) {
            console.error('Login error:', err);
            return err?.response?.data?.message || 'Login failed';
        }
    }



 const getHistoryOfUser = async() => {
    try{
            let request = await client.get("/get_all_activities", {
                params : {
                    token : localStorage.getItem("token")
                }
            });
            return req.data

    }catch(e){
        throw new Error(e?.response?.data?.message || 'Failed to fetch user history');
    }
}


const addToUserHistory = async(meeting_id) => {
    try{
        let request = await client.post("/add_activity", {
            token : localStorage.getItem("token"),
            meeting_id : meeting_id
        });
        return request.data.message || 'Activity added to history'; 
    }catch(e){
        throw new Error(e?.response?.data?.message || 'Failed to add activity to history');
    }
}
    

    const data = {
        userData,
        setUserData,
        handleRegister,
        handleLogin,
        getHistoryOfUser,
        addToUserHistory,
    }

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    )

}
