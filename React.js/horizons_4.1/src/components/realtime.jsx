import React, { useEffect, useState } from 'react';
import ruangmv9 from "@/img/ruangmv9.png"; // Make sure this path is correct
import EvotyLogo from "@/img/evoty.svg"; // Make sure this path is correct
import { motion } from "framer-motion";

const Realtime = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDateTime, setCurrentDateTime] = useState(''); // New state for date/time

  // Get the latest data per group + subgroup
  const getLatestData = (dataArray) => {
    const latestMap = new Map();

    dataArray.forEach(item => {
      const key = `${item.group_mv}_${item.subgroup_mv ?? ''}`;
      const timestamp = item.timestamp ? new Date(item.timestamp).getTime() : 0;

      if (!latestMap.has(key) || timestamp > latestMap.get(key).timestamp) {
        latestMap.set(key, { ...item, timestamp: timestamp });
      }
    });

    return Array.from(latestMap.values());
  };

  // Function to format date and time
  const formatDateTime = (date) => {
    const optionsDate = { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' };
    const optionsTime = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };

    const formattedDate = date.toLocaleDateString('en-GB', optionsDate).replace(/\//g, '.');
    const formattedTime = date.toLocaleTimeString('en-GB', optionsTime);

    const parts = formattedDate.split(' ');
    const dayMonthYear = parts[1];
    const newDayMonthYear = dayMonthYear.replace(/\./g, '/');
    return `${parts[0]} ${newDayMonthYear} ${formattedTime}`;
  };

  useEffect(() => {
    let controller = new AbortController();

    const fetchData = () => {
      // Abort previous fetch request if it's still ongoing
      controller.abort();
      controller = new AbortController();

      fetch('http://10.130.222.254:8080/get_data.php', { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error('Network response was not ok');
          return response.json();
        })
        .then((res) => {
          const filtered = getLatestData(res);
          const dataMap = {};
          filtered.forEach(item => {
            const key = `${item.group_mv}_${item.subgroup_mv ?? ''}`;
            dataMap[key] = item;
          });
          setData(dataMap);
          setLoading(false);
          setError(null); // Clear any previous errors
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            setError(err.message);
            setLoading(false);
          }
        });
    };

    fetchData(); // Initial fetch
    const dataIntervalId = setInterval(fetchData, 1000); // Fetch data every 1 second

    // Update current date/time every second
    const dateTimeIntervalId = setInterval(() => {
      setCurrentDateTime(formatDateTime(new Date()));
    }, 1000);

    // Set initial date/time
    setCurrentDateTime(formatDateTime(new Date()));

    return () => {
      clearInterval(dataIntervalId);
      clearInterval(dateTimeIntervalId);
      controller.abort(); // Cleanup on component unmount
    };
  }, []);

  const findData = (group, subgroup) => {
    const key = `${group}_${subgroup ?? ''}`;
    return data[key];
  };

  // Render box for simple metrics (like just Voltage or Current)
  // Add 'fontSizeClass' parameter to define font size
  const renderSimpleMetricBox = (value, unit, style, fontSizeClass = 'text-[14px]') => (
    <div
      className={`absolute p-1 leading-tight text-black font-bold flex flex-col items-center justify-center z-10 ${fontSizeClass}`} // Using fontSizeClass here
      style={style}
    >
      <div className="text-center">{value ?? 0} {unit}</div>
    </div>
  );

  return (
    // Apply min-width to the main container of the Realtime component
    // Adjust '1300px' as needed based on your image's optimal display width
    <motion.div
      className="border-4 border-gray-400 h-[670px] flex flex-col"
      style={{ minWidth: '1280px' }} // Added minWidth here to prevent shrinking
    >
      {/* Header Section */}
      <div className="flex justify-between items-center bg-white text-sm border-b border-gray-400 px-4 py-2 h-16">
        <div className="flex items-center">
            <img src={EvotyLogo} alt="Evoty Logo" className="h-10 w-auto" />
        </div>
        <div className="flex-1 flex justify-center items-center">
            <span className="text-[40px] font-bold">MONITORING ELECTRICAL POWER</span>
        </div>
        <div className="text-sm font-semibold">
            {currentDateTime}
        </div>
      </div>

      {/* Image area and panel. Height is manually set here */}
      {/* Keep the minWidth on the image container as well for double assurance */}
      <div className="relative w-full flex-grow overflow-hidden mx-auto" style={{ minWidth: '1200px' }}>
        <img
          src={ruangmv9}
          alt="Panel MV"
          className="absolute top-0 left-0 w-full h-full object-contain"
        />

        {/* ========================================= */}
        {/* Render Simple Metric Box (for status boxes on top) */}
        {/* ========================================= */}
        {renderSimpleMetricBox(
          findData("MV-I", "")?.voltage, "V",
          { top: '85px', left: '-10px', width: '250px', height: '0px' }, 'text-[20px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-I", "")?.current, "A",
          { top: '85px', left: '140px', width: '250px', height: '0px' }, 'text-[20px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-I", "")?.stand_kwh, "kW",
          { top: '85px', left: '290px', width: '250px', height: '0px' }, 'text-[20px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-A", "MV-A Trafo 1")?.voltage, "V",
          { top: '55px', left: '460px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-A", "MV-A Trafo 1")?.current, "A",
          { top: '99px', left: '460px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-A", "MV-A Trafo 1")?.current, "kW",
          { top: '144px', left: '460px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-A", "MV-A Trafo 2")?.voltage, "V",
          { top: '55px', left: '592px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-A", "MV-A Trafo 2")?.current, "A",
          { top: '99px', left: '592px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-A", "MV-A Trafo 2")?.current, "kW",
          { top: '144px', left: '592px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-A", "MV-A Trafo 3")?.voltage, "V",
          { top: '55px', left: '722px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-A", "MV-A Trafo 3")?.current, "A",
          { top: '99px', left: '722px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-A", "MV-A Trafo 3")?.current, "kW",
          { top: '144px', left: '722px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-A", "MV-A Trafo 4")?.voltage, "V",
          { top: '55px', left: '857px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-A", "MV-A Trafo 4")?.current, "A",
          { top: '99px', left: '857px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-A", "MV-A Trafo 4")?.current, "kW",
          { top: '144px', left: '857px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-B", "MV-B Trafo 1")?.voltage, "V",
          { top: '55px', left: '990px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-B", "MV-B Trafo 1")?.current, "A",
          { top: '99px', left: '990px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-B", "MV-B Trafo 1")?.current, "kW",
          { top: '144px', left: '990px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-B", "MV-B Trafo 2")?.voltage, "V",
          { top: '225px', left: '1068px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-B", "MV-B Trafo 2")?.current, "A",
          { top: '269px', left: '1068px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-B", "MV-B Trafo 2")?.current, "kW",
          { top: '314px', left: '1068px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-B", "MV-B Trafo 3")?.voltage, "V",
          { top: '387px', left: '1068px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-B", "MV-B Trafo 3")?.current, "A",
          { top: '431px', left: '1068px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-B", "MV-B Trafo 3")?.current, "kW",
          { top: '476px', left: '1068px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-B", "MV-B Trafo 4")?.voltage, "V",
          { top: '489px', left: '932px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-B", "MV-B Trafo 4")?.current, "A",
          { top: '533px', left: '932px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-B", "MV-B Trafo 4")?.current, "kW",
          { top: '578px', left: '932px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-C", "MV-C Trafo 1")?.voltage, "V",
          { top: '487px', left: '447px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-C", "MV-C Trafo 1")?.current, "A",
          { top: '531px', left: '447px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-C", "MV-C Trafo 1")?.current, "kW",
          { top: '576px', left: '447px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-C", "MV-C Trafo 2")?.voltage, "V",
          { top: '487px', left: '310px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-C", "MV-C Trafo 2")?.current, "A",
          { top: '531px', left: '310px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-C", "MV-C Trafo 2")?.current, "kW",
          { top: '576px', left: '310px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-U", "MV-U Trafo 1")?.voltage, "V",
          { top: '487px', left: '177px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-U", "MV-U Trafo 1")?.current, "A",
          { top: '531px', left: '177px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-U", "MV-U Trafo 1")?.current, "kW",
          { top: '576px', left: '177px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-U", "MV-U Trafo 2")?.voltage, "V",
          { top: '309px', left: '41px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-U", "MV-U Trafo 2")?.current, "A",
          { top: '353px', left: '41px', width: '250px', height: '0px' }, 'text-[14px]'
        )}
        {renderSimpleMetricBox(
          findData("MV-U", "MV-U Trafo 2")?.current, "kW",
          { top: '398px', left: '41px', width: '250px', height: '0px' }, 'text-[14px]'
        )}

        {/* Loading/Error Status */}
        {loading && <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xl text-gray-600 bg-white bg-opacity-70 px-4 py-2 rounded z-20">Loading data...</p>}
        {error && <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xl text-red-600 bg-white bg-opacity-70 px-4 py-2 rounded z-20">Error: {error}</p>}
      </div>
    </motion.div>
  );
};

export default Realtime;