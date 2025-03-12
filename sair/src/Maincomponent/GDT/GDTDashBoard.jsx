import React, { useEffect, useState } from "react";
import Header from "./GDTHeader";
import s from "../../css/Dashboard.module.css";
import "../../css/CustomModal.css";
import { useNavigate } from "react-router-dom";
import { ResponsiveLine } from "@nivo/line";
import { db } from "../../firebase"; // Import Firebase
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
          if (!data.time) return;
  
          // Convert Unix timestamp to Date
          const timestamp = new Date(data.time);
          const time = timestamp.getHours() + ":" + String(timestamp.getMinutes()).padStart(2, "0");
  
          counts[time] = (counts[time] || 0) + 1;
        });
  
        // Convert counts object to array and sort it
        const formattedData = Object.entries(counts)
          .map(([time, count]) => ({ x: time, y: count }))
          .sort((a, b) => a.x.localeCompare(b.x));
  
        if (formattedData.length === 0) {
          console.warn("No violation data available.");
        }
  
        setViolationData([
          {
            id: "Violations",
            color: "hsl(330, 70%, 50%)",
            data: formattedData.length ? formattedData : [{ x: "00:00", y: 0 }],
          },
        ]);
        
  
      } catch (error) {
        console.error("Error fetching violations:", error);
      }
    };
  
    fetchViolations();
  }, []);
  
  return (
    <div
      style={{ backgroundColor: "#80808054", height: "100vh", width: "100%" }}
    >
      <Header active="gdtdashboard" />
      <div className="breadcrumb">
        <a onClick={() => navigate("/gdthome")} style={{ cursor: "pointer" }}>
          Home
        </a>
        <span> / </span>
        <a
          onClick={() => navigate("/GDTDashBoard")}
          style={{ cursor: "pointer" }}
        >
          Dashboard
        </a>
      </div>

      <div className="charts">
      <div className={s.chart} style={{ height: "400px", width: "100%" }}>
      {console.log("Formatted Data:", violationData)}{
      violationData.length > 0 && violationData[0].data.length > 0 ? (
            <ResponsiveLine
              data={violationData}
              margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
              xScale={{ type: "point" }}
              yScale={{
                type: "linear",
                min: "auto",
                max: "auto",
                stacked: true,
                reverse: false,
              }}
              yFormat=" >-.2f"
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "transportation",
                legendOffset: 36,
                legendPosition: "middle",
                truncateTickAt: 0,
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "count",
                legendOffset: -40,
                legendPosition: "middle",
                truncateTickAt: 0,
              }}
              colors={{ scheme: "greens" }}
              pointSize={10}
              pointColor={{ theme: "background" }}
              pointBorderWidth={2}
              pointBorderColor={{ from: "serieColor" }}
              pointLabel="data.yFormatted"
              pointLabelYOffset={-12}
              enableTouchCrosshair={true}
              useMesh={true}
              legends={[
                {
                  anchor: "bottom-right",
                  direction: "column",
                  justify: false,
                  translateX: 100,
                  translateY: 0,
                  itemsSpacing: 0,
                  itemDirection: "left-to-right",
                  itemWidth: 80,
                  itemHeight: 20,
                  itemOpacity: 0.75,
                  symbolSize: 12,
                  symbolShape: "circle",
                  symbolBorderColor: "rgba(0, 0, 0, .5)",
                  effects: [
                    {
                      on: "hover",
                      style: {
                        itemBackground: "rgba(0, 0, 0, .03)",
                        itemOpacity: 1,
                      },
                    },
                  ],
                },
              ]}
            />
          ) : (
            <p>No violation data available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GDTDashboard;
