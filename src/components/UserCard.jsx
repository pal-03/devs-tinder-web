const UserCard = ({ user, onAction, actionLoading = "", showActions = true }) => {
    // destructure the user object to extract the relevant properties
    //  for display
  const { _id, firstName, lastName, photoUrl, age, gender, about } = user;
  return (
    <div className="card bg-base-300 w-full max-w-sm min-w-0 break-words shadow-xl">
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
              disabled={Boolean(actionLoading)}
              onClick={() => onAction?.("ignored", _id)}
            >
              {actionLoading === `ignored:${_id}` ? "Ignoring..." : "Ignore"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={Boolean(actionLoading)}
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
