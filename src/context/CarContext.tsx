"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Car } from "@/types/car";
import { initialCars } from "@/data/cars";
import { deleteCarPhoto } from "@/lib/storage/carPhotos";

interface CarContextType {
  cars: Car[];
  addCar: (car: Omit<Car, "id" | "createdAt">) => Car;
  updateCar: (id: string, updated: Partial<Car>) => void;
  deleteCar: (id: string) => void;
  toggleFeatured: (id: string) => void;
  toggleHidden: (id: string) => void;
  getCarById: (id: string) => Car | undefined;
  resetToDefault: () => void;
}

const CarContext = createContext<CarContextType | undefined>(undefined);

const STORAGE_KEY = "global_drive_cars_v2";

export function CarProvider({ children }: { children: React.ReactNode }) {
  const [cars, setCars] = useState<Car[]>(initialCars);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCars(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load cars from localStorage", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cars));
      } catch (e) {
        console.error("Failed to save cars to localStorage", e);
      }
    }
  }, [cars, isLoaded]);

  const addCar = (newCarData: Omit<Car, "id" | "createdAt">): Car => {
    const newCar: Car = {
      ...newCarData,
      id: `car-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setCars((prev) => [newCar, ...prev]);
    return newCar;
  };

  const updateCar = useCallback((id: string, updated: Partial<Car>) => {
    setCars((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
    );
  }, []);

  const deleteCar = (id: string) => {
    // Le foto di un'auto eliminata non devono restare nello storage.
    cars.find((c) => c.id === id)?.images.forEach((url) => void deleteCarPhoto(url));
    setCars((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleFeatured = (id: string) => {
    setCars((prev) =>
      prev.map((c) => (c.id === id ? { ...c, featured: !c.featured } : c))
    );
  };

  const toggleHidden = (id: string) => {
    setCars((prev) =>
      prev.map((c) => (c.id === id ? { ...c, hidden: !c.hidden } : c))
    );
  };

  const getCarById = (id: string) => {
    return cars.find((c) => c.id === id);
  };

  const resetToDefault = () => {
    setCars(initialCars);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <CarContext.Provider
      value={{
        cars,
        addCar,
        updateCar,
        deleteCar,
        toggleFeatured,
        toggleHidden,
        getCarById,
        resetToDefault,
      }}
    >
      {children}
    </CarContext.Provider>
  );
}

export function useCars() {
  const context = useContext(CarContext);
  if (!context) {
    throw new Error("useCars must be used within a CarProvider");
  }
  return context;
}
