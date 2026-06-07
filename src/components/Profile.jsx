import { useSelector } from "react-redux";
import EditProfile from "./EditProfile";


const Profile = () => {
  // get the user from store by subscribing to the user state using
  //  the useSelector hook. This allows us to access the current user's
  //  information and display it on the profile page. We can also use 
  // this information to pre-populate the form fields in the EditProfile 
  // component, making it easier for the user to update their profile
  //  information.
  const user = useSelector((store) => store.user);
  return (
    user && (
      <div>
        <EditProfile user={user} />
      </div>
    )
  );
};
export default Profile;