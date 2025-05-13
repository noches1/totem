from picture import Picture
import time

if __name__ == "__main__":
    picture = Picture()
    if (not picture.process()):
        picture.print_help()

    picture.run()

    while True:
        command = input()
        if not command:
            break
        if picture.thread is not None:
            picture.thread.stop()
            picture.thread.join()
        picture.name = command
        picture.run()