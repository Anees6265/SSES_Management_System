import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

import itegLogo from "../../../assets/images/logo.png";
import ssismLogo from "../../../assets/images/iteg-logo.png";
import placementBg from "../../../assets/images/ITEG_Placement_Post.jpg";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 0,
    fontFamily: "Helvetica",
    width: 400,
    height: 400,
  },
  container: {
    width: "100%",
    height: "100%",
    padding: 16,
    flexDirection: "column",
    justifyContent: "flex-end",
    alignItems: "center",
    position: "relative",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  header: {
    width: "100%",
    textAlign: "center",
  },
  logoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    width: "100%",
  },
  logo: {
    height: 56,
    width: "auto",
  },
  congratsTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#133783",
    textAlign: "center",
    marginTop: -4,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 1.4,
  },
  profileSection: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileImageContainer: {
    borderRadius: 50,
    padding: 4,
    backgroundColor: "#ffffff",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  profileImageInner: {
    borderRadius: 50,
    padding: 4,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  footerSection: {
    width: "100%",
    textAlign: "center",
    paddingTop: 12,
  },
  studentName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#133783",
    marginBottom: 4,
    textAlign: "center",
  },
  studentLocation: {
    fontSize: 10,
    color: "#000000",
    textAlign: "center",
    marginBottom: 4,
  },
  studentCourse: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000000",
    textAlign: "center",
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: "#000000",
    width: "20%",
    marginVertical: 8,
    alignSelf: "center",
  },
  placementText: {
    fontSize: 12,
    color: "#000000",
    textAlign: "center",
  },
  jobProfile: {
    fontWeight: "600",
  },
  companyName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#133783",
    textAlign: "center",
    marginTop: 4,
  },
});

const toTitleCase = (str) => {
  return str?.toLowerCase().split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const PlacementPostPDF = ({ student }) => {
  return (
    <Document>
      <Page size={[400, 400]} style={styles.page}>
        <View style={styles.container}>
          {/* Background Image */}
          <Image src={placementBg} style={styles.backgroundImage} />
          {/* Header */}
          {/* <View style={styles.header}>
            <View style={styles.logoRow}>
              <Image src={itegLogo} style={styles.logo} />
              <Image src={ssismLogo} style={styles.logo} />
            </View>
            <Text style={styles.congratsTitle}>Congratulations</Text>
            <Text style={styles.subtitle}>
              We are proud to announce that{"\n"}Our ITEG student
            </Text>
          </View> */}

          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.profileImageContainer}>
              <View style={styles.profileImageInner}>
                <Image
                  src={student.image || student.profileImage || "https://via.placeholder.com/150x150/e2e8f0/64748b?text=Student"}
                  style={styles.profileImage}
                />
              </View>
            </View>
          </View>

          {/* Footer Section */}
          <View style={styles.footerSection}>
            <Text style={styles.studentName}>
              {toTitleCase(student.firstName)} {toTitleCase(student.lastName)}
            </Text>
            <Text style={styles.studentLocation}>
              {student.village || "Location"}
            </Text>
            <Text style={styles.studentCourse}>
              {student.course || "Course"}
            </Text>
            
            <View style={styles.divider} />
            
            <Text style={styles.placementText}>
              got placed as a <Text style={styles.jobProfile}>
                {toTitleCase(student.placedInfo?.jobProfile) || "Position"}
              </Text> in
            </Text>
            <Text style={styles.companyName}>
              {toTitleCase(student.placedInfo?.companyName) || "Company"}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default PlacementPostPDF;