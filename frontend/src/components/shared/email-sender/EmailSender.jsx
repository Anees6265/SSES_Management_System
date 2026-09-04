import { useState } from 'react';

const StudentList = () => {
    // Dummy student data
    const [students] = useState([
        { id: 1, name: 'Tanu Shree', email: 'tanusoni895@gmail.com' },
        { id: 2, name: 'Keshav Vishwakarma', email: 'keshavvishwakarma@ssism.org' },
        { id: 3, name: 'Keshav Vishwakarma', email: 'keshavv.bca2021@ssism.org' },
    ]);

    // Simulate email notification
    const sendEmailNotification = (email) => {
        alert(`Test email sent to: ${email}\n\nHere is the test link: https://your-test-link.com`);

    };

    return (
        <div>
            <h2>Students List (Dummy Data)</h2>
            <ul>
            {students.map((student) => (
                    <li key={student.id}>
                        {student.name} - {student.email}
                        <button onClick={() => sendEmailNotification(student.email)}>Send Test Link</button>
                    </li>
                ))}
                
            </ul>
             
        </div>
    );
};

export default StudentList;





// import { useState, useEffect } from 'react';
// import axios from 'axios';

// const StudentList = () => {
//     const [students, setStudents] = useState([]);

//     useEffect(() => {
//         fetchStudents();
//     }, []);

//     const fetchStudents = async () => {
//         try {
//             const response = await axios.get('http://localhost:5000/students'); // Adjust backend API URL
//             setStudents(response.data);
//         } catch (error) {
//             console.error('Error fetching students:', error);
//         }
//     };

//     const sendEmailNotification = async (email) => {
//         try {
//             const testLink = 'https://your-test-link.com';
//             await axios.post('http://localhost:5000/send-email', { email, testLink });
//             alert(`Email sent to ${email}`);
//         } catch (error) {
//             console.error('Error sending email:', error);
//         }
//     };

//     return (
//         <div>
//             <h2>Students List</h2>
//             <ul>
//                 {students.map((student) => (
//                     <li key={student.id}>
//                         {student.name} - {student.email}
//                         <button onClick={() => sendEmailNotification(student.email)}>Send Test Link</button>
//                     </li>
//                 ))}
//             </ul>
//         </div>
//     );
// };

// export default StudentList;

