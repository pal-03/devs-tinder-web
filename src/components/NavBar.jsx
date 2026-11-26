import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/constants";
import { removeUser } from "../utils/userSlice";
import { removeFeed } from "../utils/feedSlice";
import { removeConnections } from "../utils/connectionSlice";
import { removeRequests } from "../utils/requestSlice";

const NavBar = () => {
  const user = useSelector((store) => store.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const avatarRef = useRef(null);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [menuOpen]);

  const handleLogout = async () => {
    closeMenu();
    try {
      navigate("/login");
      dispatch(removeUser());
      dispatch(removeFeed());
      dispatch(removeConnections());
      dispatch(removeRequests());
      await axios.post(BASE_URL + "/logout", {}, { withCredentials: true });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="navbar bg-base-300">
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost text-xl">
          DevTinder
        </Link>
      </div>
      {user ? (
        <div className="flex-none gap-2">
          <div className="form-control max-w-24 truncate text-sm sm:max-w-none sm:text-base">Welcome, {user.firstName}</div>
          {user.isPremium && <span className="badge badge-sm hidden sm:inline-flex">{user.membershipType} member</span>}
          <div
            ref={menuRef}
            className="relative mx-1 flex shrink-0 sm:mx-5"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) closeMenu();
            }}
            onKeyDown={(event) => {
              if (menuOpen && event.key === "Escape") {
                closeMenu();
                avatarRef.current?.focus();
              }
            }}
          >
            <button
              type="button"
              ref={avatarRef}
              aria-label="Account menu"
              aria-expanded={menuOpen}
              aria-controls="account-links"
              onClick={() => setMenuOpen(open => !open)}
              className="btn btn-ghost btn-circle avatar"
            >
              <div className="w-10 rounded-full">
                <img alt="user photo" src={user.photoUrl} />
              </div>
            </button>
            <ul
              id="account-links"
              className={menuOpen ? "menu menu-sm absolute right-0 top-full z-[1] mt-2 w-52 rounded-box bg-base-100 p-2 shadow" : "hidden"}
            >
              <li>
                <Link to="/profile" onClick={closeMenu}>Profile</Link>
              </li>
              <li>
                <Link to="/connections" onClick={closeMenu}>Connections</Link>
              </li>
              <li>
                <Link to="/requests" onClick={closeMenu}>Requests</Link>
              </li>
              <li>
                <Link to="/premium" onClick={closeMenu}>Premium</Link>
              </li>
              <li>
                <button type="button" onClick={handleLogout}>
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default NavBar;
