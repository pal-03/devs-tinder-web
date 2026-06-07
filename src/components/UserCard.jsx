const UserCard = ({ user, onAction, actionLoading = "", showActions = true }) => {
    // destructure the user object to extract the relevant properties
    //  for display
  const { _id, firstName, lastName, photoUrl, age, gender, about } = user;
  return (
    <div className="card bg-base-300 w-96 shadow-xl">
      <figure>
        <img src={photoUrl} alt="photo" />
      </figure>
      <div className="card-body">
        <h2 className="card-title">{firstName + " " + lastName}</h2>
        {age && gender && <p>{age + ", " + gender}</p>}
        <p>{about}</p>
        {showActions ? (
          <div className="card-actions justify-center my-4">
            <button
              type="button"
              className="btn btn-primary"
              disabled={actionLoading === `ignored:${_id}`}
              onClick={() => onAction?.("ignored", _id)}
            >
              {actionLoading === `ignored:${_id}` ? "Ignoring..." : "Ignore"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={actionLoading === `interested:${_id}`}
              onClick={() => onAction?.("interested", _id)}
            >
              {actionLoading === `interested:${_id}`
                ? "Sending..."
                : "Interested"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
export default UserCard;
