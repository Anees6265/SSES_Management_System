import Header from "../../shared/sidebar/Header";

const UserPermission = () => {
  return (
    <>
      <Header
        title="Permission Management"
        subtitle="User Permission Management Content"
        showBack={false}
      />
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p>User Permission Management Content</p>
        </div>
      </div>
    </>
  );
};

export default UserPermission;
