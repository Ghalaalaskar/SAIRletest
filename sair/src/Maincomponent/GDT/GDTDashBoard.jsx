import React, { useEffect, useState } from "react";
import Header from "./GDTHeader";
import s from "../../css/Dashboard.module.css";
import "../../css/CustomModal.css";
import { useNavigate } from "react-router-dom";
import { ResponsiveLine } from "@nivo/line";
import { db } from "../../firebase"; // Adjust according to your Firebase setup
import { collection, getDocs } from "firebase/firestore";

const GDTDashboard = () => {
  const navigate = useNavigate();
  const [violationData, setViolationData] = useState([]);

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Violation"));
        const counts = {};

        querySnapshot.forEach((doc) => {
          const data = doc.data();
      
          let timestamp;
          if (data.timestamp && typeof data.timestamp === "object" && data.timestamp.seconds) {
              // Firestore Timestamp format
              timestamp = new Date(data.timestamp.seconds * 1000);
          } else if (data.timestamp && typeof data.timestamp === "number") {
              // Unix timestamp (stored as seconds)
              timestamp = new Date(data.timestamp * 1000);
          } else {
              console.warn("Invalid timestamp format:", data.timestamp);
              return; // Skip this entry
          }
      
          const time = timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      
          counts[time] = (counts[time] || 0) + 1;
      });
      

        // Convert counts object into Nivo-compatible format
        const formattedData = [
          {
            id: "Violations",
            data: Object.keys(counts).map(time => ({
              x: time,
              y: counts[time],
            })),
          },
        ];
        console.log("Fetched data:", querySnapshot.docs.map(doc => doc.data()));
        console.log("Counts:", counts);
        console.log("Formatted data:", formattedData);
        setViolationData(formattedData);
      } catch (error) {
        console.error("Error fetching violations:", error);
      }
    };

    fetchViolations();
  }, []);

  return (
    <div style={{ backgroundColor: "#80808054", height: "100vh", width: "100%" }}>
      <Header active="gdtdashboard" />
      <div className="breadcrumb">
        <a onClick={() => navigate("/gdthome")} style={{ cursor: "pointer" }}>Home</a>
        <span> / </span>
        <a onClick={() => navigate("/GDTDashBoard")} style={{ cursor: "pointer" }}>Dashboard</a>
      </div>

      <div className="charts">
<div className={s.chart} style={{ height: 400, border: "1px solid red" }}>          {violationData.length > 0 ? (
            <ResponsiveLine
              data={violationData}
              margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: "auto", max: "auto", stacked: true, reverse: false }}
              axisBottom={{ legend: "Time", legendOffset: 36, legendPosition: "middle" }}
              axisLeft={{ legend: "Number of Violations", legendOffset: -40, legendPosition: "middle" }}
              colors={{ scheme: "greens" }}
              pointSize={10}
              pointBorderWidth={2}
              pointBorderColor={{ from: "serieColor" }}
              useMesh={true}
              legends={[
                {
                  anchor: "bottom-right",
                  direction: "column",
                  translateX: 100,
                  itemWidth: 80,
                  itemHeight: 20,
                  symbolSize: 12,
                  symbolShape: "circle",
                },
              ]}
            />
          ) : (
            <p>Loading chart...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GDTDashboard;
