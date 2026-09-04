import PageNavbar from "../../shared/navbar/PageNavbar";

const UserPermission = () => {
  return (
    <>
      <PageNavbar
        title="Permission Management"
        subtitle="User Permission Management Content"
        showBackButton={false}
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
